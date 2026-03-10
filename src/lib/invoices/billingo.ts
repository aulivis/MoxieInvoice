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
  const invoiceItems = request.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.netUnitPrice,
    net_unit_price: item.netUnitPrice,
    unit_price_type: item.unitPriceType ?? 'net',
    vat: item.vatPercent,
  }));

  const invoicePayload = {
    partner_id: partnerId,
    block_id: Number(blockId),
    type: request.invoiceType === 'proforma' ? 'proforma' : request.invoiceType === 'advance' ? 'advance' : 'invoice',
    fulfillment_date: request.fulfillmentDate,
    due_date: dueDate,
    payment_method: request.paymentMethod ?? 'bank_transfer',
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
