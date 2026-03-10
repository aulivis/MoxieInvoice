import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';
import { routing } from './routing';

/** Only refresh Supabase session on protected app routes (locale-prefixed, not login/auth). */
function isProtectedPath(pathname: string): boolean {
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/')) return false;
  const localeMatch = /^\/(hu|en)(\/|$)/.exec(pathname);
  if (!localeMatch) return false;
  const afterLocale = pathname.slice(localeMatch[0].length) || '';
  return afterLocale !== 'login' && !afterLocale.startsWith('login/');
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseResponse =
    isProtectedPath(pathname) ? await updateSession(request) : NextResponse.next({ request });

  if (pathname === '/auth/callback' || pathname.startsWith('/auth/')) {
    return supabaseResponse;
  }

  const intlResponse = createMiddleware(routing)(request);
  const intlResponseActual =
    intlResponse instanceof Promise ? await intlResponse : intlResponse;

  const setCookies = (supabaseResponse.headers.getSetCookie?.() ??
    []) as string[];
  for (const cookie of setCookies) {
    intlResponseActual.headers.append('Set-Cookie', cookie);
  }

  return intlResponseActual;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
