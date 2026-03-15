import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { formatStripePrice } from '@/lib/stripe-format';
import { rateLimitResponse } from '@/lib/rate-limit';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export type SubscriptionDetailsDTO = {
  plan: 'monthly' | 'yearly';
  status: string;
  amount: number;
  currency: string;
  formatted: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
};

export async function GET(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-stripe-subscription');
  if (rateLimited) return rateLimited;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ subscription: null });
  }

  const { data: row } = await supabase
    .from('stripe_customers')
    .select('subscription_id, status')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  const activeStatuses = ['active', 'trialing'];
  if (
    !row?.subscription_id ||
    !row.status ||
    !activeStatuses.includes(row.status)
  ) {
    return NextResponse.json({ subscription: null });
  }

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(row.subscription_id, {
      expand: ['items.data.price'],
    });

    const item = sub.items.data[0];
    const price = item?.price;
    if (!price || price.type !== 'recurring' || !price.recurring || price.unit_amount == null) {
      return NextResponse.json({ subscription: null });
    }

    const interval = price.recurring.interval === 'year' ? 'year' : 'month';
    const plan: 'monthly' | 'yearly' = interval === 'year' ? 'yearly' : 'monthly';

    const dto: SubscriptionDetailsDTO = {
      plan,
      status: sub.status,
      amount: price.unit_amount,
      currency: price.currency,
      formatted: formatStripePrice(price.unit_amount, price.currency, interval),
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelAt: sub.cancel_at ?? null,
    };

    return NextResponse.json({ subscription: dto });
  } catch (err) {
    const isNotFound =
      err && typeof err === 'object' && 'code' in err &&
      (err as { code?: string }).code === 'resource_missing';
    if (isNotFound) {
      return NextResponse.json({ subscription: null });
    }
    const message = err instanceof Error ? err.message : 'Failed to load subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
