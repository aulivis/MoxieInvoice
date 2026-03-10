/**
 * Compute gross total (with VAT) from a normalized invoice request.
 * Used when saving invoices so the list can show total_amount without parsing payload.
 */
import type { NormalizedInvoiceRequest } from './types';

export function computeTotalAmount(request: NormalizedInvoiceRequest): number {
  let total = 0;
  for (const item of request.items) {
    const net = item.quantity * item.netUnitPrice;
    const gross = net * (1 + (item.vatPercent ?? 0) / 100);
    total += gross;
  }
  return Math.round(total * 100) / 100;
}
