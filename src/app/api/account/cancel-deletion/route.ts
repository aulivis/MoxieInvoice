import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimitResponse } from '@/lib/rate-limit';

const GRACE_DAYS = 14;

export async function POST(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-account-cancel-deletion');
  if (rateLimited) return rateLimited;
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
    .select('deletion_requested_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.deletion_requested_at) {
    return NextResponse.json(
      { error: 'No deletion requested', errorCode: 'noDeletionRequested' },
      { status: 400 }
    );
  }

  const requestedAt = new Date(profile.deletion_requested_at);
  const deadline = new Date(requestedAt);
  deadline.setDate(deadline.getDate() + GRACE_DAYS);
  if (new Date() > deadline) {
    return NextResponse.json(
      { error: 'Grace period expired', errorCode: 'restoreExpired' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      deletion_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message, errorCode: 'updateFailed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Account restored' });
}
