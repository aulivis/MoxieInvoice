import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import en from '@/messages/en.json';
import hu from '@/messages/hu.json';

const GRACE_DAYS = 14;

const DELETED_EMAIL_MESSAGES = {
  en: {
    subject: (en as { deleteAccount: { deletedEmailSubject: string } }).deleteAccount.deletedEmailSubject,
    body: (en as { deleteAccount: { deletedEmailBody: string } }).deleteAccount.deletedEmailBody,
  },
  hu: {
    subject: (hu as { deleteAccount: { deletedEmailSubject: string } }).deleteAccount.deletedEmailSubject,
    body: (hu as { deleteAccount: { deletedEmailBody: string } }).deleteAccount.deletedEmailBody,
  },
} as const;

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Send "account permanently deleted" email via Resend.
 * No-op if RESEND_API_KEY is not set (replace re_xxxxxxxxx with your real API key).
 */
async function sendAccountDeletedEmail(email: string, locale: 'hu' | 'en'): Promise<void> {
  const msg = DELETED_EMAIL_MESSAGES[locale];
  await sendEmail({
    from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
    to: email,
    subject: msg.subject,
    html: `<p>${msg.body}</p>`,
  });
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron: permanently delete accounts that requested deletion 14+ days ago.
 * Secured with CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() - GRACE_DAYS);
  const deadlineIso = deadline.toISOString();

  const { data: profiles, error: selectError } = await supabase
    .from('profiles')
    .select('id, organization_id, preferred_lang')
    .not('deletion_requested_at', 'is', null)
    .lt('deletion_requested_at', deadlineIso);

  if (selectError) {
    return NextResponse.json(
      { error: selectError.message },
      { status: 500 }
    );
  }

  const results: { userId: string; deleted: boolean; error?: string }[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id;
    const orgId = profile.organization_id;
    let email: string | null = null;

    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        email = userData.user.email;
      }
    } catch {
      // Proceed with deletion even if we cannot get email
    }

    try {
      if (orgId) {
        const { error: orgError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', orgId);
        if (orgError) {
          results.push({ userId, deleted: false, error: orgError.message });
          continue;
        }
      }

      const { error: userError } = await supabase.auth.admin.deleteUser(userId);
      if (userError) {
        results.push({ userId, deleted: false, error: userError.message });
        continue;
      }

      if (email) {
        const lang = (profile.preferred_lang === 'hu' ? 'hu' : 'en') as 'hu' | 'en';
        await sendAccountDeletedEmail(email, lang);
      }
      results.push({ userId, deleted: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ userId, deleted: false, error: message });
    }
  }

  const deleted = results.filter((r) => r.deleted).length;
  return NextResponse.json({
    processed: results.length,
    deleted,
    results,
  });
}
