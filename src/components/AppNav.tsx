'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const navLinks = [
  { href: '/', key: 'dashboard' as const },
  { href: '/invoices', key: 'invoices' as const },
  { href: '/settings', key: 'settings' as const },
] as const;

export function AppNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('nav');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  if (!signedIn) return null;

  return (
    <>
      {/* Desktop nav */}
      <nav aria-label="Main" className="hidden md:flex items-center gap-6">
        {navLinks.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none ${
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-primary/10 text-primary'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {t(key)}
          </Link>
        ))}
      </nav>

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="md:hidden p-2 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-label="Mobile navigation"
          className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-card py-3 px-4 z-50"
        >
          <nav aria-label="Main mobile" className="flex flex-col gap-1">
            {navLinks.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  pathname === href || (href !== '/' && pathname.startsWith(href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
