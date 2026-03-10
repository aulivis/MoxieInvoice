import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logError } from '@/lib/logger';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function toSubscriptionStatus(
  s: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' {
  if (s === 'active' || s === 'canceled' || s === 'past_due' || s === 'trialing' || s === 'incomplete')
    return s;
  return 'incomplete';
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  // Idempotency: skip already-processed events (Stripe may re-deliver on timeout)
  const { data: alreadyProcessed } = await supabase
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (!orgId) break;

        const status = event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : toSubscriptionStatus(sub.status);

        const { error } = await supabase
          .from('stripe_customers')
          .update({
            subscription_id: sub.id,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', sub.customer);

        if (error) logError(error, { eventType: event.type, eventId: event.id });
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const orgId = session.metadata?.org_id;
        if (!orgId) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const { error } = await supabase
          .from('stripe_customers')
          .update({
            subscription_id: subscription.id,
            status: toSubscriptionStatus(subscription.status),
            updated_at: new Date().toISOString(),
          })
          .eq('org_id', orgId);

        if (error) logError(error, { eventType: event.type, eventId: event.id });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logError(err, { eventType: event.type, eventId: event.id });
    // Don't mark as processed – let Stripe retry
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }

  // Mark event as processed after successful handling
  await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id })
    .maybeSingle(); // ignore conflict if somehow inserted concurrently

  return NextResponse.json({ received: true });
}
