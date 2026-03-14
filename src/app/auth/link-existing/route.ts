import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createSupabaseAdmin(url, key, { auth: { persistSession: false } });
}

/**
 * GET /auth/link-existing?token=xxx
 * User must already be logged in as Account A (Magic Link). Token was created by POST /api/auth/link-existing-account.
 * Validates token, deletes the duplicate Google-only user (User B), invalidates the token, redirects to settings.
 * User then adds Google from the Account tab to link it to this account.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token || token.length < 16) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const admin = getAdminClient();

  const { data: row, error: selectError } = await admin
    .from('account_link_requests')
    .select('id, google_user_id, target_email, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (selectError || !row) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }
  if (new Date(row.expires_at) < new Date()) {
    await admin.from('account_link_requests').delete().eq('id', row.id);
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }

  const googleUserId = row.google_user_id as string;
  const targetEmail = row.target_email as string;

  if (currentUser.email?.toLowerCase() !== targetEmail.toLowerCase()) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }

  if (googleUserId === currentUser.id) {
    await admin.from('account_link_requests').delete().eq('id', row.id);
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(`${base}/settings?tab=account`);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(googleUserId);
  if (deleteError) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url));
  }

  await admin.from('account_link_requests').delete().eq('id', row.id);

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.redirect(`${base}/settings?tab=account&linked=existing`);
}
