'use server';

import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; success?: true; email?: string };

const getRedirectUrl = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/auth/callback`;
};

/** Map Supabase/auth error messages to translation-friendly codes for the frontend. */
function toAuthErrorCode(message: string): string {
  const m = message.trim();
  if (!m) return message;
  if (/email\s+rate\s+limit\s+exceeded/i.test(m)) {
    return 'AUTH_EMAIL_RATE_LIMIT';
  }
  const retryMatch = m.match(/for\s+security\s+purposes[^.]*after\s+(\d+)\s+seconds?/i);
  if (retryMatch) {
    return `AUTH_RETRY_AFTER:${retryMatch[1]}`;
  }
  return message;
}

export async function loginAction(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'AUTH_EMAIL_REQUIRED' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getRedirectUrl(),
    },
  });
  if (error) {
    return { error: toAuthErrorCode(error.message) };
  }
  return { success: true, email };
}
