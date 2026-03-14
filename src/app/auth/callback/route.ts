import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Ensure next is a safe relative path to avoid open redirects. */
function safeNext(next: string): string {
  const path = next.trim() || '/';
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next') ?? '/');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc('create_organization_for_user');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const forwardedHost = request.headers.get('x-forwarded-host');
      const redirectBase =
        !isLocalEnv && forwardedHost
          ? `https://${forwardedHost}`
          : origin;
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

