/**
 * Pull-based sync: fetch payment status from the billing provider (Billingo or Számlázz.hu)
 * and update invoices.payment_status + optionally notify Moxie.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';
import { createMoxieClient } from '@/lib/moxie/client';
import { logError } from '@/lib/logger';
import { computeTotalAmount } from './total-amount';
import type { NormalizedInvoiceRequest } from './types';
import {
  getBillingoDocument,
  isBillingoDocumentPaid,
  type BillingoCredentials,
} from './billingo';
import {
  getSzamlazzDocument,
  isSzamlazzDocumentPaid,
  type SzamlazzCredentials,
} from './szamlazz';

const SYNC_INVOICES_LIMIT = 100;

export interface InvoiceForPaymentSync {
  id: string;
  org_id: string;
  external_id: string | null;
  moxie_invoice_id: string | null;
  total_amount: number | null;
  payload_snapshot: { buyer?: { name?: string }; items?: unknown[] } | null;
}

/**
 * Resolve the gross total for a payment notification.
 * Prefers stored total_amount; falls back to computing from payload_snapshot items.
 */
function resolveAmount(invoice: {
  total_amount: number | null;
  payload_snapshot: { buyer?: { name?: string }; items?: unknown[] } | null;
}): number {
  const stored = Number(invoice.total_amount);
  if (stored > 0) return stored;
  if (invoice.payload_snapshot) {
    try {
      return computeTotalAmount(invoice.payload_snapshot as NormalizedInvoiceRequest);
    } catch {
      // payload missing required fields — fall through
    }
  }
  return 0;
}

/**
 * Mark invoice as paid in DB and notify Moxie if the invoice is linked to Moxie.
 * Shared by webhook and sync so Moxie notification logic is not duplicated.
 * Returns moxieNotified flag AND any error message if Moxie notification failed.
 */
export async function markInvoicePaidAndNotifyMoxie(
  supabase: SupabaseClient,
  invoice: {
    id: string;
    org_id: string;
    moxie_invoice_id: string | null;
    total_amount: number | null;
    payload_snapshot: { buyer?: { name?: string }; items?: unknown[] } | null;
  }
): Promise<{ moxieNotified: boolean; moxieError?: string }> {
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({ payment_status: 'paid' })
    .eq('id', invoice.id);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  if (!invoice.moxie_invoice_id || !invoice.org_id) {
    return { moxieNotified: false };
  }

  const amount = resolveAmount(invoice);
  if (amount <= 0) {
    return { moxieNotified: false, moxieError: `Összeg nem meghatározható (invoice ${invoice.id})` };
  }

  try {
    const { data: moxie } = await supabase
      .from('moxie_connections')
      .select('base_url, api_key_encrypted')
      .eq('org_id', invoice.org_id)
      .maybeSingle();

    if (!moxie?.base_url || !moxie?.api_key_encrypted) {
      return { moxieNotified: false, moxieError: 'Moxie kapcsolat nem konfigurált' };
    }

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
    return { moxieNotified: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(err instanceof Error ? err : new Error(message), {
      step: 'mark_invoice_paid_moxie_notify',
      invoiceId: invoice.id,
      moxieInvoiceId: invoice.moxie_invoice_id,
    });
    return { moxieNotified: false, moxieError: message };
  }
}

/**
 * For one org: fetch open invoices with external_id, query each document from the
 * configured billing provider (Billingo or Számlázz.hu), and if paid update
 * payment_status + notify Moxie.
 */
export async function syncBillingoPaymentsForOrg(
  orgId: string,
  supabase: SupabaseClient
): Promise<{ updated: number; moxieNotified: number; moxieErrors: string[]; openInvoicesChecked: number }> {
  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', orgId)
    .maybeSingle();

  const provider = billing?.provider;
  if (!billing || (provider !== 'billingo' && provider !== 'szamlazz') || !billing.credentials_encrypted) {
    return { updated: 0, moxieNotified: 0, moxieErrors: [], openInvoicesChecked: 0 };
  }

  // Decrypt and parse credentials per provider
  let billingoCredentials: BillingoCredentials | null = null;
  let szamlazzCredentials: SzamlazzCredentials | null = null;
  try {
    const rawCreds = billing.credentials_encrypted;
    const decrypted =
      typeof rawCreds === 'string' ? await decrypt(rawCreds) : JSON.stringify(rawCreds);
    const parsed = JSON.parse(decrypted) as Record<string, string>;
    if (provider === 'billingo') {
      billingoCredentials = { apiKey: parsed.apiKey ?? parsed.api_key ?? '' };
    } else {
      szamlazzCredentials = {
        agentKey: parsed.agentKey ?? parsed.agent_key,
        username: parsed.username,
        password: parsed.password,
      };
    }
  } catch {
    return { updated: 0, moxieNotified: 0, moxieErrors: [], openInvoicesChecked: 0 };
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, org_id, external_id, moxie_invoice_id, total_amount, payload_snapshot')
    .eq('org_id', orgId)
    .not('external_id', 'is', null)
    .eq('payment_status', 'open')
    .limit(SYNC_INVOICES_LIMIT);

  if (!invoices?.length) return { updated: 0, moxieNotified: 0, moxieErrors: [], openInvoicesChecked: 0 };

  let updated = 0;
  let moxieNotified = 0;
  const moxieErrors: string[] = [];

  for (const inv of invoices as InvoiceForPaymentSync[]) {
    const externalId = inv.external_id;
    if (!externalId) continue;

    // --- Fetch document info from the billing provider (payment status only; no URL handling) ---
    let isPaid = false;

    if (provider === 'billingo' && billingoCredentials) {
      let docInfo;
      try {
        docInfo = await getBillingoDocument(billingoCredentials, externalId);
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          step: 'sync_billingo_get_document',
          orgId,
          externalId,
          invoiceId: inv.id,
        });
        continue;
      }
      if (!docInfo) continue;
      isPaid = isBillingoDocumentPaid(docInfo);
    } else if (provider === 'szamlazz' && szamlazzCredentials) {
      let docInfo;
      try {
        docInfo = await getSzamlazzDocument(szamlazzCredentials, externalId);
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          step: 'sync_szamlazz_get_document',
          orgId,
          externalId,
          invoiceId: inv.id,
        });
        continue;
      }
      if (!docInfo) continue;
      isPaid = isSzamlazzDocumentPaid(docInfo);
    }

    if (!isPaid) continue;

    try {
      const { moxieNotified: notified, moxieError } = await markInvoicePaidAndNotifyMoxie(supabase, inv);
      updated += 1;
      if (notified) {
        moxieNotified += 1;
      } else if (moxieError && inv.moxie_invoice_id) {
        // Only report error if Moxie was expected to be notified (moxie_invoice_id is set)
        moxieErrors.push(moxieError);
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        step: 'sync_provider_mark_paid',
        orgId,
        invoiceId: inv.id,
      });
    }
  }

  return { updated, moxieNotified, moxieErrors, openInvoicesChecked: invoices.length };
}
