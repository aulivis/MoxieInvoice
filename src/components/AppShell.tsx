'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        {t('skipToContent')}
      </a>

      {/* Desktop sidebar – dark, fixed left, md+ only */}
      {signedIn && <Sidebar />}

      <div className={signedIn ? 'min-h-screen md:ml-[240px]' : 'min-h-screen'}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-light bg-background-card/95 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Logo – visible on mobile when signed in (sidebar is hidden), always when signed out */}
            {signedIn ? (
              <span className="font-bold text-base text-text-primary md:hidden">
                MoxieInvoice
              </span>
            ) : (
              <Link
                href="/"
                className="font-bold text-base text-text-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md outline-none transition-colors"
              >
                MoxieInvoice
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Language switcher: in header when mobile (sidebar hidden), always when signed out */}
            <div className={signedIn ? 'md:hidden' : ''}>
              <LanguageSwitcher />
            </div>
            {/* Auth controls – only when signed out (signed-in auth is in sidebar footer) */}
            {!signedIn && <HeaderAuth />}
          </div>
        </header>

        <main
          id="main-content"
          className={`min-h-[calc(100vh-56px)] bg-surface-50 p-4 md:p-6 ${signedIn ? 'pb-bottom-nav md:pb-6' : ''}`}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab navigation */}
      {signedIn && <MobileBottomNav />}
    </>
  );
}
