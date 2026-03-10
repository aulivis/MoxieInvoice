/**
 * Invoice orchestrator: normalized request → Billingo or Számlázz.hu → save → Moxie callback.
 */

import { createClient } from '@supabase/supabase-js';
import type { NormalizedInvoiceRequest, InvoiceResult } from './types';
import { computeTotalAmount } from './total-amount';
import { createBillingoInvoice } from './billingo';
import { createSzamlazzInvoice } from './szamlazz';
import {
  validateBillingoRequest,
  buildBillingoValidationMessage,
} from './billingo-validate';
import {
  validateSzamlazzRequest,
  buildSzamlazzValidationMessage,
} from './szamlazz-validate';
import { mergeInvoiceRequestWithDefaults } from './merge-defaults';
import type { BillingProviderType } from '@/types/database';

export interface CreateInvoiceInput {
  orgId: string;
  provider: BillingProviderType;
  credentials: Record<string, unknown>;
  request: NormalizedInvoiceRequest;
  moxieInvoiceId?: string;
  moxieBaseUrl?: string;
  moxieApiKey?: string;
  /** Locale for validation error messages (Billingo / Számlázz.hu) (default 'hu'). */
  locale?: 'hu' | 'en';
}

export type CreateInvoiceOutput =
  | { success: true; invoiceId: string; externalId: string; invoiceNumber: string; pdfUrl?: string }
  | { success: false; errorMessage: string };

function needsBillingoDefaults(request: NormalizedInvoiceRequest): boolean {
  const hasBlockId = request.blockId != null && request.blockId !== '' && Number(request.blockId) >= 1;
  const hasLanguage = (request.language?.trim() ?? '').length > 0;
  const hasPaymentMethod = (request.paymentMethod?.trim() ?? '').length > 0;
  return !hasBlockId || !hasLanguage || !hasPaymentMethod;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
  const { orgId, provider, credentials, request: rawRequest, moxieInvoiceId, moxieBaseUrl, moxieApiKey, locale = 'hu' } = input;
  let request = rawRequest;

  if (provider === 'billingo' && needsBillingoDefaults(request)) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (url && secret) {
      const admin = createClient(url, secret);
      const { data: orgSettings } = await admin
        .from('org_settings')
        .select('default_invoice_block_id, default_invoice_language, default_payment_method')
        .eq('org_id', orgId)
        .maybeSingle();
      request = mergeInvoiceRequestWithDefaults(request, orgSettings ?? null);
    }
  }

  if (provider === 'billingo') {
    const validation = validateBillingoRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        errorMessage: buildBillingoValidationMessage(validation.errors, locale),
      };
    }
  }
  if (provider === 'szamlazz') {
    const validation = validateSzamlazzRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        errorMessage: buildSzamlazzValidationMessage(validation.errors, locale),
      };
    }
  }

  let result: InvoiceResult;
  try {
    if (provider === 'billingo') {
      result = await createBillingoInvoice(
        { apiKey: String(credentials.apiKey || credentials.api_key || '') },
        request
      );
    } else if (provider === 'szamlazz') {
      result = await createSzamlazzInvoice(
        {
          agentKey: credentials.agentKey as string | undefined,
          username: credentials.username as string | undefined,
          password: credentials.password as string | undefined,
        },
        request
      );
    } else {
      return { success: false, errorMessage: `Unknown provider: ${provider}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errorMessage: message };
  }

  const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());
  const totalAmount = computeTotalAmount(request);
  const { data: row, error: insertErr } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      moxie_invoice_id: moxieInvoiceId || null,
      external_id: result.externalId,
      provider,
      status: 'created',
      pdf_url: result.pdfUrl || null,
      total_amount: totalAmount,
      payload_snapshot: request as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (insertErr || !row) {
    return {
      success: false,
      errorMessage: insertErr?.message || 'Failed to save invoice record',
    };
  }

  if (moxieBaseUrl && moxieApiKey && result.pdfUrl) {
    try {
      const base = moxieBaseUrl.replace(/\/$/, '').replace(/\/api\/public\/?$/i, '');
      const form = new FormData();
      form.set('type', 'DELIVERABLE');
      form.set('id', moxieInvoiceId || row.id);
      form.set('fileUrl', result.pdfUrl);
      form.set('fileName', `invoice-${result.invoiceNumber}.pdf`);
      const moxieRes = await fetch(
        `${base}/api/public/action/attachments/createFromUrl`,
        {
          method: 'POST',
          headers: { 'X-API-KEY': moxieApiKey },
          body: form,
        }
      );
      if (moxieRes.ok) {
        await supabase
          .from('invoices')
          .update({ status: 'synced_to_moxie' })
          .eq('id', row.id);
      }
    } catch {
      // Non-fatal: invoice was created, only Moxie sync failed
    }
  }

  return {
    success: true,
    invoiceId: row.id,
    externalId: result.externalId,
    invoiceNumber: result.invoiceNumber,
    pdfUrl: result.pdfUrl,
  };
}
