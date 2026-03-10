/**
 * Billingo API v3 adapter.
 * @see https://api.billingo.hu/
 */

import type { NormalizedInvoiceRequest, InvoiceResult } from './types';

/** Billingo API v3 base; use /v3 not /api/v3 (404 on wrong path). */
const BILLINGO_API_BASE = 'https://api.billingo.hu/v3';

/**
 * Billingo often returns 404 "Common is not found" when block_id is invalid or does not exist
 * (e.g. wrong számlatömb ID or block deleted). Turn this into a clear error message.
 */
function formatBillingoDocumentError(status: number, body: string, blockId?: number): string {
  let parsed: { error?: { message?: string } } = {};
  try {
    parsed = JSON.parse(body) as { error?: { message?: string } };
  } catch {
    // ignore
  }
  const msg = parsed?.error?.message ?? body;
  if (status === 404 && /common is not found/i.test(msg)) {
    return `Billingo document: 404 – ${msg} A gyakori ok: érvénytelen vagy nem létező számlatömb (block) azonosító. Ellenőrizd a Beállításokban a „Számlatömb” mezőt (block_id: ${blockId ?? '?'}), és hogy a Billingo fiókodban létezik-e ilyen számlatömb (Számvevő → Számlatömbök).`;
  }
  return `Billingo document: ${status} ${body}`;
}

export interface BillingoCredentials {
  apiKey: string;
}

/** Document block (számlatömb) from Billingo GET /document-blocks. */
export interface BillingoDocumentBlock {
  id: number;
  name?: string;
  prefix?: string;
  type?: string;
}

/** Paginated list from Billingo; we only use data. */
interface BillingoDocumentBlockListResponse {
  data?: BillingoDocumentBlock[];
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
}

/**
 * List document blocks (számlatömbök) from Billingo. Uses GET /document-blocks.
 * The first block in the list is often the default in Billingo; we return it as defaultBlockId when present.
 */
export async function listBillingoBlocks(
  credentials: BillingoCredentials
): Promise<{ blocks: BillingoDocumentBlock[]; defaultBlockId?: number }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-API-KEY': credentials.apiKey,
  };

  const res = await fetch(
    `${BILLINGO_API_BASE}/document-blocks?per_page=100&page=1`,
    { headers }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Billingo document-blocks: ${res.status} ${errText}`);
  }

  const json = (await res.json()) as BillingoDocumentBlockListResponse;
  const blocks = Array.isArray(json?.data) ? json.data : [];
  const defaultBlockId = blocks.length > 0 ? blocks[0].id : undefined;
  return { blocks, defaultBlockId };
}

/** Billingo v3 document (GET /documents/{id}) – total and total_paid for payment status. */
export interface BillingoDocumentPaymentInfo {
  total: number;
  total_paid: number;
  /** True when Billingo response had status === 'paid' (used when total_paid not present). */
  _paid?: boolean;
}

/**
 * Get a single document from Billingo by id. Used to check payment status (total_paid vs total).
 * Returns null on 404 or when the document is not found.
 */
export async function getBillingoDocument(
  credentials: BillingoCredentials,
  documentId: string
): Promise<BillingoDocumentPaymentInfo | null> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-API-KEY': credentials.apiKey,
  };

  const res = await fetch(`${BILLINGO_API_BASE}/documents/${encodeURIComponent(documentId)}`, {
    headers,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Billingo document: ${res.status} ${errText}`);
  }

  const doc = (await res.json()) as {
    // Billingo v3 uses gross_total for the invoice total; older/internal may use total
    gross_total?: number;
    total?: number;
    // Amount paid; Billingo v3 uses paid_amount on the document object
    paid_amount?: number;
    total_paid?: number;
    totalPaid?: number;
    // Primary payment status field in Billingo v3: 'outstanding' | 'paid' | 'partial'
    payment_status?: string;
    // Fallback status field
    status?: string;
  };
  const total = Number(doc?.gross_total ?? doc?.total) || 0;
  const totalPaid = Number(doc?.paid_amount ?? doc?.total_paid ?? doc?.totalPaid) || 0;
  const statusPaid =
    (typeof doc?.payment_status === 'string' && doc.payment_status.toLowerCase() === 'paid') ||
    (typeof doc?.status === 'string' && doc.status.toLowerCase() === 'paid');
  // Consider paid if explicit payment_status/status === 'paid' OR total_paid >= total
  const paid = statusPaid || (total > 0 && totalPaid >= total);
  return { total, total_paid: totalPaid, _paid: paid };
}

/**
 * Returns true if the document is considered paid (total_paid >= total and total > 0,
 * or Billingo response had status === 'paid').
 */
export function isBillingoDocumentPaid(info: BillingoDocumentPaymentInfo): boolean {
  if (info._paid === true) return true;
  return info.total > 0 && info.total_paid >= info.total;
}

/**
 * Send document by email via Billingo API (POST /documents/{id}/send).
 * @see https://app.swaggerhub.com/apis/Billingo/Billingo/3.0.13#/Document/SendDocument
 * Only call when emails array is non-empty.
 */
export async function sendBillingoDocumentByEmail(
  credentials: BillingoCredentials,
  documentId: string,
  emails: string[]
): Promise<void> {
  const validEmails = emails.filter((e) => typeof e === 'string' && e.trim().length > 0);
  if (validEmails.length === 0) return;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-KEY': credentials.apiKey,
  };

  const res = await fetch(`${BILLINGO_API_BASE}/documents/${encodeURIComponent(documentId)}/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ emails: validEmails }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Billingo send document: ${res.status} ${errText}`);
  }
}

/** Billingo v3 payment_method enum values (from API spec). User selects from these. */
export const BILLINGO_PAYMENT_METHODS = [
  'aruhitel',
  'bankcard',
  'barion',
  'barter',
  'cash',
  'cash_on_delivery',
  'coupon',
  'elore_utalas',
  'ep_kartya',
  'kompenzacio',
  'levonas',
  'online_bankcard',
  'other',
  'paylike',
  'payoneer',
  'paypal',
  'paypal_utolag',
  'payu',
  'pick_pack_pont',
  'postai_csekk',
  'postautalvany',
  'skrill',
  'szep_card',
  'transferwise',
  'upwork',
  'utalvany',
  'valto',
  'wire_transfer',
] as const;

/** Billingo v3 document language enum. */
export const BILLINGO_LANGUAGES = ['hu', 'en', 'de', 'fr', 'hr', 'it', 'ro', 'sk', 'us'] as const;

/** Billingo v3 item.vat enum (string). Common percent values + special codes. */
export const BILLINGO_VAT_OPTIONS = [
  '0%',
  '1%',
  '2%',
  '3%',
  '4%',
  '5%',
  '5,5%',
  '6%',
  '7%',
  '7,7%',
  '8%',
  '9%',
  '9,5%',
  '10%',
  '11%',
  '12%',
  '13%',
  '14%',
  '15%',
  '16%',
  '17%',
  '18%',
  '19%',
  '20%',
  '21%',
  '22%',
  '23%',
  '24%',
  '25%',
  '26%',
  '27%',
  'AAM',
  'AM',
  'EU',
  'EUK',
  'F.AFA',
  'FAD',
  'K.AFA',
  'MAA',
  'TAM',
  'ÁKK',
  'ÁTHK',
] as const;

export async function createBillingoInvoice(
  credentials: BillingoCredentials,
  request: NormalizedInvoiceRequest
): Promise<InvoiceResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-KEY': credentials.apiKey,
  };

  const partnerPayload = {
    name: request.buyer.name,
    address: {
      country_code: request.buyer.countryCode || 'HU',
      post_code: request.buyer.postCode,
      city: request.buyer.city,
      address: request.buyer.address,
    },
    emails: request.buyer.email ? [request.buyer.email] : [],
    taxcode: request.buyer.taxNumber || '',
  };

  const partnerRes = await fetch(`${BILLINGO_API_BASE}/partners`, {
    method: 'POST',
    headers,
    body: JSON.stringify(partnerPayload),
  });

  if (!partnerRes.ok) {
    const errText = await partnerRes.text();
    throw new Error(`Billingo partner: ${partnerRes.status} ${errText}`);
  }

  const partner = (await partnerRes.json()) as { id: number };
  const partnerId = partner.id;

  const blockId = request.blockId;
  if (blockId == null || Number.isNaN(Number(blockId)) || Number(blockId) < 1) {
    throw new Error(
      'Billingo: block_id (számlatömb) kötelező és pozitív egész kell legyen. Állítsd be a Beállításokban az alapértelmezett számlatömböt, vagy add meg a kérésben.'
    );
  }

  const dueDate = request.dueDate || request.fulfillmentDate;
  // Billingo v3 expects item.vat as string enum e.g. '27%', '18%', '5%', '0%'
  const vatToString = (percent: number): string => {
    if (Number.isInteger(percent)) return `${percent}%`;
    const s = percent.toFixed(1).replace('.', ',');
    return `${s}%`;
  };
  const invoiceItems = request.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.netUnitPrice,
    net_unit_price: item.netUnitPrice,
    unit_price_type: item.unitPriceType ?? 'net',
    vat: vatToString(item.vatPercent),
  }));

  const invoicePayload = {
    partner_id: partnerId,
    block_id: Number(blockId),
    type: request.invoiceType === 'proforma' ? 'proforma' : request.invoiceType === 'advance' ? 'advance' : 'invoice',
    fulfillment_date: request.fulfillmentDate,
    due_date: dueDate,
    payment_method: request.paymentMethod ?? 'wire_transfer',
    language: request.language ?? 'hu',
    currency: request.currency,
    comment: request.comment || '',
    items: invoiceItems,
  };

  const invoiceRes = await fetch(`${BILLINGO_API_BASE}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(invoicePayload),
  });

  if (!invoiceRes.ok) {
    const errText = await invoiceRes.text();
    const message = formatBillingoDocumentError(invoiceRes.status, errText, blockId);
    throw new Error(message);
  }

  const doc = (await invoiceRes.json()) as {
    id: number;
    invoice_number?: string;
    public_url?: string;
  };

  return {
    externalId: String(doc.id),
    invoiceNumber: doc.invoice_number || String(doc.id),
    pdfUrl: doc.public_url,
  };
}
