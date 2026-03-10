/**
 * Pull-based sync: fetch payment status from Billingo (GET document) and update
 * invoices.payment_status + optionally notify Moxie.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';
import { createMoxieClient } from '@/lib/moxie/client';
import { logError } from '@/lib/logger';
import {
  getBillingoDocument,
  isBillingoDocumentPaid,
  type BillingoCredentials,
} from './billingo';

const SYNC_INVOICES_LIMIT = 100;

export interface InvoiceForPaymentSync {
  id: string;
  org_id: string;
  external_id: string | null;
  moxie_invoice_id: string | null;
  total_amount: number | null;
  payload_snapshot: { buyer?: { name?: string } } | null;
}

/**
 * Mark invoice as paid in DB and notify Moxie if the invoice is linked to Moxie.
 * Shared by webhook and sync so Moxie notification logic is not duplicated.
 */
export async function markInvoicePaidAndNotifyMoxie(
  supabase: SupabaseClient,
  invoice: {
    id: string;
    org_id: string;
    moxie_invoice_id: string | null;
    total_amount: number | null;
    payload_snapshot: { buyer?: { name?: string } } | null;
  }
): Promise<{ moxieNotified: boolean }> {
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({ payment_status: 'paid' })
    .eq('id', invoice.id);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  let moxieNotified = false;
  const amount = Number(invoice.total_amount) || 0;
  if (invoice.moxie_invoice_id && invoice.org_id && amount > 0) {
    try {
      const { data: moxie } = await supabase
        .from('moxie_connections')
        .select('base_url, api_key_encrypted')
        .eq('org_id', invoice.org_id)
        .maybeSingle();

      if (moxie?.base_url && moxie?.api_key_encrypted) {
        const apiKey = await decrypt(moxie.api_key_encrypted);
        const client = createMoxieClient(moxie.base_url, apiKey);
        const date = new Date().toISOString().slice(0, 10);
        const clientName = invoice.payload_snapshot?.buyer?.name?.trim();
        await client.applyPayment({
          date,
          amount,
          invoiceNumber: invoice.moxie_invoice_id,
          paymentType: 'BANK_TRANSFER',
          ...(clientName ? { clientName } : {}),
        });
        moxieNotified = true;
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        step: 'mark_invoice_paid_moxie_notify',
        invoiceId: invoice.id,
        moxieInvoiceId: invoice.moxie_invoice_id,
      });
    }
  }
  return { moxieNotified };
}

/**
 * For one org: fetch open invoices with external_id, GET each document from Billingo,
 * and if paid, update payment_status and notify Moxie.
 */
export async function syncBillingoPaymentsForOrg(
  orgId: string,
  supabase: SupabaseClient
): Promise<{ updated: number; moxieNotified: number }> {
  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!billing || billing.provider !== 'billingo' || !billing.credentials_encrypted) {
    return { updated: 0, moxieNotified: 0 };
  }

  let credentials: BillingoCredentials;
  try {
    const rawCreds = billing.credentials_encrypted;
    const decrypted =
      typeof rawCreds === 'string' ? await decrypt(rawCreds) : JSON.stringify(rawCreds);
    const parsed = JSON.parse(decrypted) as { apiKey?: string; api_key?: string };
    credentials = { apiKey: parsed.apiKey ?? parsed.api_key ?? '' };
  } catch {
    return { updated: 0, moxieNotified: 0 };
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, org_id, external_id, moxie_invoice_id, total_amount, payload_snapshot')
    .eq('org_id', orgId)
    .not('external_id', 'is', null)
    .eq('payment_status', 'open')
    .limit(SYNC_INVOICES_LIMIT);

  if (!invoices?.length) return { updated: 0, moxieNotified: 0 };

  let updated = 0;
  let moxieNotified = 0;

  for (const inv of invoices as InvoiceForPaymentSync[]) {
    const externalId = inv.external_id;
    if (!externalId) continue;

    let docInfo;
    try {
      docInfo = await getBillingoDocument(credentials, externalId);
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        step: 'sync_billingo_get_document',
        orgId,
        externalId,
        invoiceId: inv.id,
      });
      continue;
    }

    if (!docInfo || !isBillingoDocumentPaid(docInfo)) continue;

    try {
      const { moxieNotified: notified } = await markInvoicePaidAndNotifyMoxie(supabase, inv);
      updated += 1;
      if (notified) moxieNotified += 1;
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        step: 'sync_billingo_mark_paid',
        orgId,
        invoiceId: inv.id,
      });
    }
  }

  return { updated, moxieNotified };
}
