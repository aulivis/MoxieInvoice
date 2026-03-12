/**
 * Apply currency conversion when request.targetCurrency differs from request.currency.
 * Fetches rate (MNB or manual from org settings), multiplies item amounts, sets request.currency = targetCurrency.
 */

import type { NormalizedInvoiceRequest } from './types';
import { getExchangeRate, type CurrencyOrgSettings } from './exchange-rate';

export async function applyCurrencyConversion(
  request: NormalizedInvoiceRequest,
  orgSettings: CurrencyOrgSettings | null
): Promise<NormalizedInvoiceRequest> {
  const target = request.targetCurrency;
  if (!target || target === request.currency) return request;

  const rate = await getExchangeRate(
    request.currency,
    target,
    request.fulfillmentDate,
    orgSettings
  );

  const items = request.items.map((item) => ({
    ...item,
    netUnitPrice: Math.round(item.netUnitPrice * rate * 100) / 100,
  }));

  const { targetCurrency: _t, ...rest } = request;
  return {
    ...rest,
    currency: target,
    items,
  };
}
