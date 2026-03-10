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

/** Treat blockId as missing when undefined, null, 0, empty string, or not a positive number. */
function isBlockIdMissing(value: unknown): boolean {
  if (value == null || value === '') return true;
  const n = Number(value);
  return Number.isNaN(n) || n < 1;
}

export function mergeInvoiceRequestWithDefaults(
  request: NormalizedInvoiceRequest,
  defaults: InvoiceDefaultSettings | null
): NormalizedInvoiceRequest {
  const base = ensureItemUnitPriceType(request);
  if (!defaults) {
    return base;
  }
  const blockId = isBlockIdMissing(request.blockId)
    ? (defaults.default_invoice_block_id != null ? Number(defaults.default_invoice_block_id) : undefined)
    : Number(request.blockId);
  const language = request.language?.trim() || defaults.default_invoice_language?.trim() || undefined;
  const paymentMethod = request.paymentMethod?.trim() || defaults.default_payment_method?.trim() || undefined;
  const merged: NormalizedInvoiceRequest = {
    ...base,
    blockId,
    language,
    paymentMethod,
  };
  return merged;
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
