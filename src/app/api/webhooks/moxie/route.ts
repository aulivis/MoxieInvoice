import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createInvoice } from '@/lib/invoices/orchestrator';
import { mergeInvoiceRequestWithDefaults } from '@/lib/invoices/merge-defaults';
import { computeTotalAmount } from '@/lib/invoices/total-amount';
import type { NormalizedInvoiceRequest } from '@/lib/invoices/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { decrypt } from '@/lib/crypto';
import { logError } from '@/lib/logger';

const WEBHOOK_LIMIT_PER_MIN = 60;

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

/**
 * Moxie webhook: receive invoice events and create invoices via Billingo/Számlázz.hu.
 * Secured via webhook_secret query parameter (set when configuring Moxie connection).
 * Webhook URL format: /api/webhooks/moxie?org=ORG_ID&secret=WEBHOOK_SECRET
 *
 * You must configure this URL in Moxie: Workspace → Webhooks → add endpoint with
 * event type "InvoiceSent". When an invoice is set to Sent in Moxie, Moxie POSTs here
 * and we issue the invoice with your billing provider.
 */
export async function POST(request: NextRequest) {
  const id = getClientIdentifier(request);
  const limit = checkRateLimit(`webhook-moxie:${id}`, WEBHOOK_LIMIT_PER_MIN);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  const orgId = request.nextUrl.searchParams.get('org');
  const providedSecret = request.nextUrl.searchParams.get('secret');

  if (!orgId) {
    return NextResponse.json({ error: 'Missing org' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Verify webhook secret before processing
  const { data: moxie } = await supabase
    .from('moxie_connections')
    .select('base_url, api_key_encrypted, webhook_secret')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!moxie?.webhook_secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 403 });
  }
  if (providedSecret !== moxie.webhook_secret) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 });
  }

  const eventType = (request.headers.get('X-Event-Type') || '').trim();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  // Only issue invoice when Moxie sends "InvoiceSent" (invoice marked as Sent in Moxie)
  if (eventType !== 'InvoiceSent') {
    return NextResponse.json({ received: true, skipped: `Event type "${eventType || 'unknown'}" not processed (only InvoiceSent triggers issuing)` });
  }

  const { data: sub } = await supabase
    .from('stripe_customers')
    .select('status')
    .eq('org_id', orgId)
    .maybeSingle();
  if (sub?.status !== 'active' && sub?.status !== 'trialing') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { data: billing } = await supabase
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!billing?.credentials_encrypted || !moxie.base_url || !moxie.api_key_encrypted) {
    return NextResponse.json({ error: 'Moxie or billing not configured' }, { status: 400 });
  }

  // Decrypt credentials
  let credentials: Record<string, unknown>;
  let moxieApiKey: string;
  try {
    const rawCreds = billing.credentials_encrypted;
    const decrypted = typeof rawCreds === 'string' ? await decrypt(rawCreds) : JSON.stringify(rawCreds);
    credentials = JSON.parse(decrypted) as Record<string, unknown>;
    moxieApiKey = await decrypt(moxie.api_key_encrypted);
  } catch (err) {
    logError(err, { step: 'decrypt_credentials', orgId });
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  const normalized = normalizeMoxiePayload(body, eventType);
  if (!normalized) {
    return NextResponse.json({ received: true, skipped: 'No invoice data' });
  }

  const { data: orgSettings } = await supabase
    .from('org_settings')
    .select('default_invoice_block_id, default_invoice_language, default_payment_method')
    .eq('org_id', orgId)
    .maybeSingle();

  const mergedRequest = mergeInvoiceRequestWithDefaults(normalized.request, orgSettings ?? null);

  const locale = (request.headers.get('Accept-Language')?.toLowerCase().startsWith('en') ? 'en' : 'hu') as 'hu' | 'en';
  const result = await createInvoice({
    orgId,
    provider: billing.provider,
    credentials,
    request: mergedRequest,
    moxieInvoiceId: normalized.moxieInvoiceId,
    moxieBaseUrl: moxie.base_url,
    moxieApiKey,
    locale,
    supabase,
  });

  if (!result.success) {
    logError(new Error(result.errorMessage ?? 'Invoice creation failed'), { orgId, step: 'webhook_create_invoice' });
    const totalAmount = computeTotalAmount(mergedRequest);
    await supabase.from('invoices').insert({
      org_id: orgId,
      provider: billing.provider,
      status: 'failed',
      error_message: result.errorMessage,
      moxie_invoice_id: normalized.moxieInvoiceId || null,
      total_amount: totalAmount,
      payload_snapshot: mergedRequest as unknown as Record<string, unknown>,
    });
  }

  return NextResponse.json({ received: true });
}

/** Moxie InvoiceSent payload uses clientInfo; optional legacy payload uses client + items */
type MoxieLineItem = {
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  rate?: number;
  vat?: number;
  taxable?: boolean;
};

function normalizeMoxiePayload(
  body: Record<string, unknown>,
  _eventType: string
): { request: NormalizedInvoiceRequest; moxieInvoiceId?: string } | null {
  // 1) Moxie InvoiceSent: clientInfo + lineItems or items, or totals as fallback
  const clientInfo = body.clientInfo as Record<string, unknown> | undefined;
  if (clientInfo) {
    const contact = clientInfo.contact as Record<string, unknown> | undefined;
    const email = (contact?.email ?? clientInfo.email) as string | undefined;
    const name = String(clientInfo.name ?? '');
    if (!name) return null;

    const lineItems =
      (body.lineItems as MoxieLineItem[] | undefined) ??
      (body.items as MoxieLineItem[] | undefined);
    let items: Array<{ name: string; quantity: number; unit: string; netUnitPrice: number; vatPercent: number }>;

    if (lineItems?.length) {
      items = lineItems.map((item) => {
        const qty = Number(item.quantity ?? 1);
        const rate = Number(item.rate ?? item.unit_price ?? 0);
        return {
          name: String(item.name ?? item.description ?? 'Item'),
          quantity: qty,
          unit: 'db',
          netUnitPrice: rate,
          vatPercent: Number(item.vat ?? 27),
        };
      });
    } else {
      const total = Number(body.total ?? body.subTotal ?? 0);
      const tax = Number(body.tax ?? 0);
      const subTotal = Number(body.subTotal ?? total - tax);
      if (subTotal <= 0 && total <= 0) return null;
      const netTotal = total > 0 && tax >= 0 ? total - tax : subTotal;
      const vatPct = netTotal > 0 && tax > 0 ? Math.round((tax / netTotal) * 100) : 27;
      items = [
        {
          name: 'Invoice',
          quantity: 1,
          unit: 'db',
          netUnitPrice: netTotal,
          vatPercent: vatPct,
        },
      ];
    }

    const request: NormalizedInvoiceRequest = {
      buyer: {
        name,
        taxNumber: (clientInfo.taxId ?? clientInfo.tax_id) as string | undefined,
        postCode: String(clientInfo.postal ?? clientInfo.postCode ?? ''),
        city: String(clientInfo.city ?? ''),
        address: String(clientInfo.address1 ?? clientInfo.address ?? ''),
        countryCode: (clientInfo.country ?? 'HU') as string,
        email,
      },
      items,
      currency: (body.currency as string) || 'HUF',
      fulfillmentDate: (body.dateSent as string) || (body.dateCreated as string) || new Date().toISOString().slice(0, 10),
      dueDate: (body.dateDue as string) || body.due_date as string | undefined,
      comment: body.comment as string | undefined,
    };
    return {
      request,
      moxieInvoiceId: (body.invoiceNumberFormatted ?? String(body.invoiceNumber ?? body.id ?? body.invoice_id ?? '')).trim() || undefined,
    };
  }

  // 2) Legacy/custom payload: client + items
  const client = body.client as Record<string, unknown> | undefined;
  const itemsRaw = body.items as MoxieLineItem[] | undefined;
  if (!client || !itemsRaw?.length) return null;

  const name = String(client.name ?? '');
  const address = (client.address as Record<string, unknown>) || {};
  const request: NormalizedInvoiceRequest = {
    buyer: {
      name,
      taxNumber: client.tax_number as string | undefined,
      postCode: String(address.post_code ?? address.postCode ?? ''),
      city: String(address.city ?? ''),
      address: String(address.line1 ?? address.address ?? ''),
      countryCode: (address.country_code ?? address.countryCode ?? 'HU') as string,
      email: client.email as string | undefined,
    },
    items: itemsRaw.map((item) => ({
      name: String(item.name ?? item.description ?? 'Item'),
      quantity: Number(item.quantity ?? 1),
      unit: 'db',
      netUnitPrice: Number(item.rate ?? item.unit_price ?? 0),
      vatPercent: Number(item.vat ?? 27),
    })),
    currency: (body.currency as string) || 'HUF',
    fulfillmentDate: (body.fulfillment_date as string) || new Date().toISOString().slice(0, 10),
    dueDate: body.due_date as string | undefined,
    comment: body.comment as string | undefined,
  };

  return {
    request,
    moxieInvoiceId: (body.invoiceNumberFormatted ?? (body.invoiceNumber != null ? String(body.invoiceNumber) : undefined) ?? body.invoice_id) as string | undefined,
  };
}
