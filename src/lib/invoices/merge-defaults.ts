/**
 * Merge org-level default invoice fields into a normalized request.
 * Used when the Moxie payload or manual form does not provide blockId, language, or paymentMethod.
 */

import type { NormalizedInvoiceRequest } from './types';

export interface InvoiceDefaultSettings {
  default_invoice_block_id?: number | null;
  default_invoice_language?: string | null;
  default_payment_method?: string | null;
}

export function mergeInvoiceRequestWithDefaults(
  request: NormalizedInvoiceRequest,
  defaults: InvoiceDefaultSettings | null
): NormalizedInvoiceRequest {
  if (!defaults) {
    return ensureItemUnitPriceType(request);
  }
  const blockId =
    request.blockId ??
    (defaults.default_invoice_block_id != null ? Number(defaults.default_invoice_block_id) : undefined);
  const merged: NormalizedInvoiceRequest = {
    ...request,
    blockId,
    language: request.language?.trim() || defaults.default_invoice_language?.trim() || undefined,
    paymentMethod: request.paymentMethod?.trim() || defaults.default_payment_method?.trim() || undefined,
  };
  return ensureItemUnitPriceType(merged);
}

function ensureItemUnitPriceType(
  request: NormalizedInvoiceRequest
): NormalizedInvoiceRequest {
  const items = request.items.map((item) => ({
    ...item,
    unitPriceType: item.unitPriceType ?? 'net',
  }));
  return { ...request, items };
}
