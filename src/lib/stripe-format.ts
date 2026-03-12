/** Zero-decimal currencies: amount is the full value (no minor units). */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

export function formatStripePrice(
  amount: number,
  currency: string,
  interval: 'month' | 'year'
): string {
  const code = currency.toLowerCase();
  const value = ZERO_DECIMAL_CURRENCIES.has(code) ? amount : amount / 100;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  const suffix = interval === 'month' ? '/month' : '/year';
  return `${formatted}${suffix}`;
}
