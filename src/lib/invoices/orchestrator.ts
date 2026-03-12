/**
 * Invoice orchestrator: normalized request → Billingo or Számlázz.hu → save → Moxie callback.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedInvoiceRequest, InvoiceResult } from './types';
import { computeTotalAmount } from './total-amount';
import { createBillingoInvoice, sendBillingoDocumentByEmail } from './billingo';
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
import { logError } from '@/lib/logger';
import type { BillingProviderType } from '@/types/database';

export interface CreateInvoiceInput {
  orgId: string;
  provider: BillingProviderType;
  credentials: Record<string, unknown>;
  request: NormalizedInvoiceRequest;
  moxieInvoiceId?: string;
  moxieInvoiceUuid?: string;
  moxieBaseUrl?: string;
  moxieApiKey?: string;
  /** Locale for validation error messages (Billingo / Számlázz.hu) (default 'hu'). */
  locale?: 'hu' | 'en';
  /** Supabase client to use for DB insert/update. Use authenticated client (RLS) or service role (bypass RLS). */
  supabase?: SupabaseClient;
}

export type CreateInvoiceOutput =
  | { success: true; invoiceId: string; externalId: string; invoiceNumber: string; pdfUrl?: string }
  | { success: false; errorMessage: string };

function needsBillingoDefaults(request: NormalizedInvoiceRequest): boolean {
  const hasBlockId = request.blockId != null && request.blockId >= 1;
  const hasLanguage = (request.language?.trim() ?? '').length > 0;
  const hasPaymentMethod = (request.paymentMethod?.trim() ?? '').length > 0;
  return !hasBlockId || !hasLanguage || !hasPaymentMethod;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceOutput> {
  const { orgId, provider, credentials, request: rawRequest, moxieInvoiceId, moxieInvoiceUuid, moxieBaseUrl, moxieApiKey, locale = 'hu' } = input;
  let request = rawRequest;
  let billingoOrgSettings: { billingo_send_invoice_by_email?: boolean } | null = null;

  if (provider === 'billingo') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (url && secret) {
      const admin = createClient(url, secret);
      const { data: orgSettings } = await admin
        .from('org_settings')
        .select('default_invoice_block_id, default_invoice_language, default_payment_method, billingo_send_invoice_by_email')
        .eq('org_id', orgId)
        .maybeSingle();
      billingoOrgSettings = orgSettings ?? null;
      if (needsBillingoDefaults(request)) {
        request = mergeInvoiceRequestWithDefaults(request, orgSettings ?? null);
      }
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

  const supabase =
    input.supabase ??
    (await import('@/lib/supabase/server').then((m) => m.createClient()));
  if (!supabase) {
    return { success: false, errorMessage: 'Database client not available' };
  }
  // Generate a one-time token for the PDF proxy endpoint.
  // Stored in DB; cleared after successful Moxie attachment sync.
  const pdfToken = globalThis.crypto.randomUUID();

  const totalAmount = computeTotalAmount(request);
  const { data: row, error: insertErr } = await supabase
    .from('invoices')
    .insert({
      org_id: orgId,
      moxie_invoice_id: moxieInvoiceId || null,
      moxie_invoice_uuid: input.moxieInvoiceUuid || null,
      external_id: result.externalId,
      invoice_number: result.invoiceNumber || null,
      provider,
      status: 'created',
      pdf_url: result.pdfUrl || null,
      pdf_token: pdfToken,
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

  if (provider === 'billingo' && billingoOrgSettings?.billingo_send_invoice_by_email && request.buyer?.email?.trim()) {
    try {
      await sendBillingoDocumentByEmail(
        { apiKey: String(credentials.apiKey || credentials.api_key || '') },
        result.externalId,
        [request.buyer.email.trim()]
      );
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        step: 'billingo_send_document',
        orgId,
        documentId: result.externalId,
      });
    }
  }

  if (moxieBaseUrl && moxieApiKey) {
    // Build the PDF proxy URL. Moxie will download the actual PDF binary from this endpoint.
    // NEXT_PUBLIC_APP_URL must be set to the public app URL (e.g. https://app.example.com).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const proxyUrl = appUrl
      ? `${appUrl}/api/invoices/${row.id}/pdf?token=${pdfToken}`
      : null;

    // Fall back to viewer URL if app URL is not configured (Moxie may or may not handle HTML)
    const fileUrl = proxyUrl ?? result.pdfUrl;

    if (fileUrl) {
      try {
        const base = moxieBaseUrl.replace(/\/$/, '').replace(/\/api\/public\/?$/i, '');
        const form = new FormData();
        form.set('type', 'DELIVERABLE');
        // Use deliverable object ID (UUID from webhook) for attachment; fallback to invoice number then row id.
        const attachmentId = moxieInvoiceUuid ?? moxieInvoiceId ?? row.id;
        form.set('id', attachmentId);
        form.set('fileUrl', fileUrl);
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
          // Clear the pdf_token after successful sync (one-time use)
          await supabase
            .from('invoices')
            .update({ status: 'synced_to_moxie', pdf_token: null })
            .eq('id', row.id);
        } else {
          const errText = await moxieRes.text().catch(() => '');
          logError(new Error(`Moxie attachFileFromUrl failed: ${moxieRes.status} ${errText}`), {
            step: 'moxie_attach_pdf',
            orgId,
            invoiceId: row.id,
            invoiceNumber: result.invoiceNumber,
          });
          // On 404 (e.g. deliverable not found), clear pdf_token so we don't retry; invoice stays created.
          if (moxieRes.status === 404) {
            await supabase
              .from('invoices')
              .update({ pdf_token: null })
              .eq('id', row.id);
          }
        }
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          step: 'moxie_attach_pdf',
          orgId,
          invoiceId: row.id,
        });
      }
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
