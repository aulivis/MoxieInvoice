import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createInvoice } from '@/lib/invoices/orchestrator';
import { mergeInvoiceRequestWithDefaults } from '@/lib/invoices/merge-defaults';
import { applyCurrencyConversion } from '@/lib/invoices/apply-currency-conversion';
import { computeTotalAmount } from '@/lib/invoices/total-amount';
import type { NormalizedInvoiceRequest } from '@/lib/invoices/types';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { decrypt } from '@/lib/crypto';
import { logError } from '@/lib/logger';
import { createMoxieClient } from '@/lib/moxie/client';
import { getOrgOwnerEmail } from '@/lib/moxie/get-org-owner-email';

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
    .select('default_invoice_block_id, default_invoice_language, default_payment_method, default_moxie_project_name, conversion_source, manual_eur_huf, manual_usd_huf, manual_usd_eur, fixed_eur_huf_rate')
    .eq('org_id', orgId)
    .maybeSingle();

  const mergedRequest = mergeInvoiceRequestWithDefaults(normalized.request, orgSettings ?? null);

  let finalRequest: NormalizedInvoiceRequest;
  try {
    finalRequest = await applyCurrencyConversion(mergedRequest, orgSettings ?? null, supabase);
  } catch (err) {
    logError(err, { orgId, step: 'apply_currency_conversion' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Currency conversion failed' },
      { status: 500 }
    );
  }

  const locale = (request.headers.get('Accept-Language')?.toLowerCase().startsWith('en') ? 'en' : 'hu') as 'hu' | 'en';
  const result = await createInvoice({
    orgId,
    provider: billing.provider,
    credentials,
    request: finalRequest,
    moxieInvoiceId: normalized.moxieInvoiceId,
    moxieInvoiceUuid: normalized.moxieInvoiceUuid,
    moxieClientId: normalized.moxieClientId,
    moxieBaseUrl: moxie.base_url,
    moxieApiKey,
    locale,
    supabase,
  });

  if (!result.success) {
    logError(new Error(result.errorMessage ?? 'Invoice creation failed'), { orgId, step: 'webhook_create_invoice' });
    const totalAmount = computeTotalAmount(finalRequest);
    await supabase.from('invoices').insert({
      org_id: orgId,
      provider: billing.provider,
      status: 'failed',
      error_message: result.errorMessage,
      moxie_invoice_id: normalized.moxieInvoiceId || null,
      moxie_invoice_uuid: normalized.moxieInvoiceUuid || null,
      total_amount: totalAmount,
      payload_snapshot: finalRequest as unknown as Record<string, unknown>,
    });

    const clientName = finalRequest.buyer?.name?.trim();
    const projectName = extractProjectName(body, orgSettings ?? null);
    if (clientName && projectName && result.errorMessage) {
      try {
        const ownerEmail = await getOrgOwnerEmail(supabase, orgId);
        const moxieClient = createMoxieClient(moxie.base_url, moxieApiKey);
        await moxieClient.createTask({
          name: 'Számla létrehozás sikertelen',
          clientName,
          projectName,
          description: result.errorMessage,
          dueDate: new Date().toISOString().slice(0, 10),
          priority: 1,
          ...(ownerEmail ? { assignedTo: [ownerEmail] } : {}),
        });
      } catch (taskErr) {
        logError(taskErr instanceof Error ? taskErr : new Error(String(taskErr)), {
          step: 'moxie_create_task_failed_invoice',
          orgId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

/** Moxie InvoiceSent payload uses clientInfo; optional legacy payload uses client + items */

/**
 * Try to extract a proper UUID (8-4-4-4-12 format) from common Moxie invoice ID fields.
 * body.id is often a MongoDB ObjectId (24-char hex, no hyphens) which is not the UUID
 * used in Moxie's web app URLs. Prioritize fields that contain a real UUID.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractMoxieInvoiceUuid(body: Record<string, unknown>): string | undefined {
  const candidates = [body.uuid, body.invoiceUuid, body.invoice_uuid, body.id, body.invoice_id];
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (UUID_RE.test(s)) return s;
  }
  return undefined;
}

/**
 * Extract project name for Create Task: from webhook body first, then org default.
 * Create Task API requires exact match of a project owned by the client.
 */
function extractProjectName(
  body: Record<string, unknown>,
  orgSettings: { default_moxie_project_name?: string | null } | null
): string | undefined {
  const fromBody =
    (body.projectName as string)?.trim() ||
    (body.projectNameFormatted as string)?.trim() ||
    ((body.project as Record<string, unknown>)?.name as string)?.trim();
  if (fromBody) return fromBody;
  const fromOrg = orgSettings?.default_moxie_project_name?.trim();
  return fromOrg || undefined;
}

type MoxieLineItem = {
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  rate?: number;
  vat?: number;
  taxable?: boolean;
};

/**
 * Extract a custom field value by its Moxie mappingKey.
 * Handles the standard `customFields: [{ mappingKey, value }]` array shape.
 */
function getCustomFieldValue(
  container: Record<string, unknown> | undefined,
  mappingKey: string
): string | undefined {
  if (!container) return undefined;
  const fields = container.customFields as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(fields)) return undefined;
  const match = fields.find(
    (f) => f !== null && typeof f === 'object' && f.mappingKey === mappingKey
  );
  if (!match) return undefined;
  const val = String(match.value ?? '').trim();
  return val || undefined;
}

/**
 * Extract buyer tax number using the following priority:
 *   1. Native Moxie clientInfo fields: taxId / tax_id
 *   2. Custom field with mappingKey "eori" (clientInfo.customFields, then body.customFields)
 * Returns undefined when neither is present — triggers validation block.
 */
function extractBuyerTaxNumber(
  clientInfo: Record<string, unknown>,
  body: Record<string, unknown>
): string | undefined {
  const native = String(clientInfo.taxId ?? clientInfo.tax_id ?? '').trim();
  if (native) return native;
  return (
    getCustomFieldValue(clientInfo, 'eori') ??
    getCustomFieldValue(body, 'eori')
  );
}

const INV_CURRENCY_KEY = 'inv-currency';
/** Moxie custom field mappingKey for legal form. "cég" => tax required; empty or "magánszemély" => tax not required. */
const LEGAL_FORM_KEY = 'legal-form';
const ALLOWED_CURRENCIES = ['EUR', 'HUF', 'USD'] as const;

/** Resolve target currency from inv-currency custom field. Empty or "Alapértelmezett" => use default (no conversion). */
function resolveTargetCurrency(
  defaultCurrency: string,
  body: Record<string, unknown>,
  clientOrClientInfo: Record<string, unknown> | undefined
): string {
  const raw =
    getCustomFieldValue(body, INV_CURRENCY_KEY) ??
    getCustomFieldValue(clientOrClientInfo, INV_CURRENCY_KEY);
  const v = String(raw ?? '').trim();
  if (!v || v.toLowerCase() === 'alapértelmezett') return defaultCurrency;
  const upper = v.toUpperCase();
  if (ALLOWED_CURRENCIES.includes(upper as (typeof ALLOWED_CURRENCIES)[number])) return upper;
  return defaultCurrency;
}

/** Map Moxie rm-inv-type custom field to normalized invoiceType for Billingo/Számlázz.hu. */
function mapRmInvTypeToInvoiceType(
  value: string | undefined
): 'proforma' | 'invoice' | 'advance' {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'díjbekérő') return 'proforma';
  if (v === 'előleg' || v === 'advance') return 'advance';
  // számla, ismétlődő, végszámla, üres, ismeretlen → normál számla
  return 'invoice';
}

/** Extract Moxie client id for CLIENT attachment (createFromUrl). Prefer clientInfo.id / _id, then body.clientId. */
function extractMoxieClientId(
  body: Record<string, unknown>,
  clientInfoOrClient?: Record<string, unknown>
): string | undefined {
  const fromClient = clientInfoOrClient
    ? String(clientInfoOrClient.id ?? clientInfoOrClient._id ?? '').trim()
    : '';
  if (fromClient) return fromClient;
  const fromBody = String(body.clientId ?? body.client_id ?? '').trim();
  return fromBody || undefined;
}

function normalizeMoxiePayload(
  body: Record<string, unknown>,
  _eventType: string
): { request: NormalizedInvoiceRequest; moxieInvoiceId?: string; moxieInvoiceUuid?: string; moxieClientId?: string } | null {
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
          vatPercent: Number(item.vat ?? 0),
        };
      });
    } else {
      const total = Number(body.total ?? body.subTotal ?? 0);
      const tax = Number(body.tax ?? 0);
      const subTotal = Number(body.subTotal ?? total - tax);
      if (subTotal <= 0 && total <= 0) return null;
      const netTotal = total > 0 && tax >= 0 ? total - tax : subTotal;
      const vatPct = netTotal > 0 && tax > 0 ? Math.round((tax / netTotal) * 100) : 0;
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

    const rmInvType =
      getCustomFieldValue(body, 'rm-inv-type') ??
      getCustomFieldValue(clientInfo, 'rm-inv-type');
    const defaultCurrency = (body.currency as string) || (clientInfo?.currency as string) || 'HUF';
    const targetCurrency = resolveTargetCurrency(defaultCurrency, body, clientInfo);
    const registrationNo =
      getCustomFieldValue(clientInfo, 'reg-no') ?? getCustomFieldValue(body, 'reg-no');
    const legalForm =
      getCustomFieldValue(clientInfo, LEGAL_FORM_KEY) ?? getCustomFieldValue(body, LEGAL_FORM_KEY);
    const request: NormalizedInvoiceRequest = {
      buyer: {
        name,
        taxNumber: extractBuyerTaxNumber(clientInfo, body),
        ...(registrationNo ? { registrationNo } : {}),
        ...(legalForm !== undefined ? { legalForm } : {}),
        postCode: String(clientInfo.postal ?? clientInfo.postCode ?? ''),
        city: String(clientInfo.city ?? ''),
        address: String(clientInfo.address1 ?? clientInfo.address ?? ''),
        countryCode: (clientInfo.country ?? 'HU') as string,
        email,
      },
      items,
      currency: defaultCurrency,
      ...(targetCurrency !== defaultCurrency ? { targetCurrency } : {}),
      fulfillmentDate: (body.dateSent as string) || (body.dateCreated as string) || new Date().toISOString().slice(0, 10),
      dueDate: (body.dateDue as string) || body.due_date as string | undefined,
      comment: body.comment as string | undefined,
      invoiceType: mapRmInvTypeToInvoiceType(rmInvType),
    };
    return {
      request,
      moxieInvoiceId: (String(body.invoiceNumberFormatted ?? body.invoiceNumber ?? body.id ?? body.invoice_id ?? '').trim()) || undefined,
      moxieInvoiceUuid: extractMoxieInvoiceUuid(body),
      moxieClientId: extractMoxieClientId(body, clientInfo),
    };
  }

  // 2) Legacy/custom payload: client + items
  const client = body.client as Record<string, unknown> | undefined;
  const itemsRaw = body.items as MoxieLineItem[] | undefined;
  if (!client || !itemsRaw?.length) return null;

  const name = String(client.name ?? '');
  const address = (client.address as Record<string, unknown>) || {};
  const rmInvType =
    getCustomFieldValue(body, 'rm-inv-type') ?? getCustomFieldValue(client, 'rm-inv-type');
  const defaultCurrency = (body.currency as string) || (client.currency as string) || 'HUF';
  const targetCurrency = resolveTargetCurrency(defaultCurrency, body, client);
  const regNo = getCustomFieldValue(client, 'reg-no') ?? getCustomFieldValue(body, 'reg-no');
  const legalForm =
    getCustomFieldValue(client, LEGAL_FORM_KEY) ?? getCustomFieldValue(body, LEGAL_FORM_KEY);
  const request: NormalizedInvoiceRequest = {
    buyer: {
      name,
      taxNumber:
        String(client.tax_number ?? '').trim() ||
        getCustomFieldValue(client, 'eori') ||
        getCustomFieldValue(body, 'eori') ||
        undefined,
      ...(regNo ? { registrationNo: regNo } : {}),
      ...(legalForm !== undefined ? { legalForm } : {}),
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
      vatPercent: Number(item.vat ?? 0),
    })),
    currency: defaultCurrency,
    ...(targetCurrency !== defaultCurrency ? { targetCurrency } : {}),
    fulfillmentDate: (body.fulfillment_date as string) || new Date().toISOString().slice(0, 10),
    dueDate: body.due_date as string | undefined,
    comment: body.comment as string | undefined,
    invoiceType: mapRmInvTypeToInvoiceType(rmInvType),
  };

  return {
    request,
    moxieInvoiceId: (body.invoiceNumberFormatted ?? (body.invoiceNumber != null ? String(body.invoiceNumber) : undefined) ?? body.invoice_id) as string | undefined,
    moxieInvoiceUuid: extractMoxieInvoiceUuid(body),
    moxieClientId: extractMoxieClientId(body, client),
  };
}
