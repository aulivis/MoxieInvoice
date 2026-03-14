import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { sendEmail } from '@/lib/resend';

const TOKEN_BYTES = 32;
const EXPIRES_MINUTES = 30;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createSupabaseAdmin(url, key, { auth: { persistSession: false } });
}

/**
 * POST /api/auth/link-existing-account
 * Body: { email: string }
 * Called when user is logged in with Google only (User B) and wants to link to an existing Magic Link account (Account A).
 * Creates a one-time token, stores it in account_link_requests, sends a magic link to the given email.
 * When the user clicks the link they sign in as Account A and are redirected to /auth/link-existing?token=xxx to complete the merge.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Find existing user (Account A) by email
  let targetUserId: string | null = null;
  let page = 1;
  const perPage = 50;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      targetUserId = found.id;
      break;
    }
    if ((data.users?.length ?? 0) < perPage) break;
    page++;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'no_account' }, { status: 400 });
  }

  // Do not allow linking to self
  if (targetUserId === currentUser.id) {
    return NextResponse.json({ error: 'same_account' }, { status: 400 });
  }

  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await admin
    .from('account_link_requests')
    .insert({
      token_hash: tokenHash,
      google_user_id: currentUser.id,
      target_email: email,
      expires_at: expiresAt,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const nextPath = `/auth/link-existing?token=${token}`;
  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  const raw = linkData as unknown as { action_link?: string; properties?: { action_link?: string } };
  const actionLink = raw?.action_link ?? raw?.properties?.action_link;

  if (linkError || !actionLink) {
    return NextResponse.json(
      { error: linkError?.message || 'Failed to generate link' },
      { status: 500 }
    );
  }
  const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
  const subject = 'Brixa – Összekapcsolás meglévő fiókkal';
  const html = `<p>Kattints az alábbi linkre a Google belépésed és a meglévő Brixa fiókod összekapcsolásához:</p><p><a href="${actionLink}">Összekapcsolás</a></p><p>A link ${EXPIRES_MINUTES} percig érvényes.</p>`;

  const sendResult = await sendEmail({ from, to: email, subject, html });
  if (sendResult.error) {
    return NextResponse.json(
      { error: sendResult.error.message || 'Failed to send email' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
