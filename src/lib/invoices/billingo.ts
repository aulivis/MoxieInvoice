/**
 * Billingo API v3 adapter.
 * @see https://api.billingo.hu/
 */

import type { NormalizedInvoiceRequest, InvoiceResult } from './types';

/** Billingo API v3 base; use /v3 not /api/v3 (404 on wrong path). */
const BILLINGO_API_BASE = 'https://api.billingo.hu/v3';

export interface BillingoCredentials {
  apiKey: string;
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
    block_id: request.blockId,
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
    throw new Error(`Billingo document: ${invoiceRes.status} ${errText}`);
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
