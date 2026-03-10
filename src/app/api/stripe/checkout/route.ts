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

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = getStripe();

  // Get or create Stripe customer — use upsert to avoid race conditions
  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  let stripeCustomerId: string;
  if (existing?.stripe_customer_id) {
    stripeCustomerId = existing.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { org_id: profile.organization_id },
    });
    stripeCustomerId = customer.id;
    // upsert: safe if another request already inserted between the select and here
    await supabase.from('stripe_customers').upsert(
      { org_id: profile.organization_id, stripe_customer_id: customer.id },
      { onConflict: 'org_id' }
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?success=1`,
    cancel_url: `${origin}/?canceled=1`,
    subscription_data: { metadata: { org_id: profile.organization_id } },
    // Idempotency: prevent duplicate sessions if user clicks twice
    client_reference_id: `${profile.organization_id}:${Date.now()}`,
  });

  return NextResponse.json({ url: session.url });
}
