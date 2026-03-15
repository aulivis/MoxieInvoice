import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { formatStripePrice } from '@/lib/stripe-format';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export type PriceInfo = {
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  formatted: string;
};

export async function GET(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-stripe-prices');
  if (rateLimited) return rateLimited;
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
        formatted: formatStripePrice(price.unit_amount, price.currency, interval),
      };
      if (interval === 'month') result.monthly = info;
      else result.yearly = info;
    } catch {
      // skip invalid or missing price
    }
  }

  return NextResponse.json(result);
}
