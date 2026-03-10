'use server';

import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; success?: true; email?: string };

const getRedirectUrl = () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/auth/callback`;
};

export async function loginAction(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'Email is required.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getRedirectUrl(),
    },
  });
  if (error) return { error: error.message };
  return { success: true, email };
}
