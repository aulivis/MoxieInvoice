import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', errorCode: 'unauthorized' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, deletion_requested_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found', errorCode: 'noProfile' },
      { status: 400 }
    );
  }

  if (profile.deletion_requested_at) {
    return NextResponse.json(
      { error: 'Deletion already requested', errorCode: 'deletionAlreadyRequested' },
      { status: 400 }
    );
  }

  const orgId = profile.organization_id;
  if (orgId) {
    const { data: stripeRow } = await supabase
      .from('stripe_customers')
      .select('subscription_id, status')
      .eq('org_id', orgId)
      .maybeSingle();

    const isActive =
      stripeRow?.status === 'active' || stripeRow?.status === 'trialing';
    if (isActive && stripeRow?.subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(stripeRow.subscription_id);
      } catch (err) {
        // Continue: set deletion_requested_at even if cancel fails (e.g. already canceled)
        // One retry for transient errors
        try {
          const stripe = getStripe();
          await stripe.subscriptions.cancel(stripeRow.subscription_id);
        } catch {
          // Still proceed with suspension
        }
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      deletion_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message, errorCode: 'updateFailed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Account suspension requested',
    deletionRequestedAt: new Date().toISOString(),
  });
}
