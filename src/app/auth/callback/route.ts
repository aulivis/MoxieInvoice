import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Ensure next is a safe relative path to avoid open redirects. */
function safeNext(next: string): string {
  const path = next.trim() || '/';
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

/** True if the auth error means the provider (e.g. Google) is already linked to another user. */
function isAlreadyLinkedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already') ||
    m.includes('registered') ||
    m.includes('identity') ||
    m.includes('in use')
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next') ?? '/');

  const isLocalEnv = process.env.NODE_ENV === 'development';
  const forwardedHost = request.headers.get('x-forwarded-host');
  const redirectBase =
    !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc('create_organization_for_user');
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
    if (isAlreadyLinkedError(error.message)) {
      return NextResponse.redirect(`${redirectBase}/login?error=google_already_used`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

