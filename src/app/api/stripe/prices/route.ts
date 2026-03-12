import Stripe from 'stripe';
import { NextResponse } from 'next/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

/** Zero-decimal currencies: amount is the full value (no minor units). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

function formatPrice(amount: number, currency: string, interval: 'month' | 'year'): string {
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

export type PriceInfo = {
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  formatted: string;
};

export async function GET() {
  const priceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const priceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;
  const allowedIds = [priceIdMonthly, priceIdYearly].filter(Boolean);
  if (allowedIds.length === 0) {
    return NextResponse.json(
      { error: 'Stripe prices not configured' },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const result: { monthly?: PriceInfo; yearly?: PriceInfo } = {};

  for (const priceId of allowedIds) {
    if (!priceId) continue;
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.type !== 'recurring' || !price.recurring || !price.unit_amount) continue;
      const interval = price.recurring.interval === 'year' ? 'year' : 'month';
      const info: PriceInfo = {
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval,
        formatted: formatPrice(price.unit_amount, price.currency, interval),
      };
      if (interval === 'month') result.monthly = info;
      else result.yearly = info;
    } catch {
      // skip invalid or missing price
    }
  }

  return NextResponse.json(result);
}
