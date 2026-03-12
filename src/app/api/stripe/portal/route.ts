import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', errorCode: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization', errorCode: 'noOrganization' }, { status: 400 });
  }

  const { data: row } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!row?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No subscription found. Please subscribe first.', errorCode: 'noSubscription' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const isStripeError = err && typeof err === 'object' && 'code' in err;
    const code = isStripeError ? (err as { code?: string }).code : undefined;
    const isMissingCustomer =
      code === 'resource_missing' ||
      (err instanceof Error && /no such customer|customer.*not found/i.test(err.message));

    if (isMissingCustomer) {
      // Invalid or test customer ID (e.g. manually set in DB without real Stripe subscription)
      await supabase
        .from('stripe_customers')
        .update({
          stripe_customer_id: null,
          subscription_id: null,
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', profile.organization_id);
      return NextResponse.json(
        { error: 'Subscription record is invalid. Please subscribe again.', errorCode: 'stripeCustomerInvalid' },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : 'Failed to open billing portal';
    return NextResponse.json(
      { error: message, errorCode: 'portalFailed' },
      { status: 500 }
    );
  }
}
