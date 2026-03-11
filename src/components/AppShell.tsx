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
        <header className={`sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-light bg-background-card/95 backdrop-blur-sm px-4 md:px-6${signedIn ? ' md:hidden' : ''}`}>
          <div className="flex items-center gap-3">
            {/* Logo – visible on mobile when signed in (sidebar is hidden), always when signed out */}
            {signedIn ? (
              <span className="flex items-center gap-2 md:hidden">
                <svg width="24" height="24" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect width="110" height="110" rx="28" fill="#1A2744"/>
                  <path d="M22 75 L22 50 Q22 28 44 28 L55 28" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
                  <path d="M88 75 L88 50 Q88 28 66 28 L55 28" stroke="rgba(255,255,255,0.35)" strokeWidth="11" strokeLinecap="round" fill="none"/>
                  <line x1="30" y1="75" x2="80" y2="75" stroke="#E8893A" strokeWidth="9" strokeLinecap="round"/>
                  <circle cx="55" cy="28" r="6" fill="#E8893A"/>
                </svg>
                <span className="font-extrabold text-base text-text-primary tracking-tight" style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}>Brixa</span>
              </span>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-2 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md outline-none transition-opacity"
              >
                <svg width="24" height="24" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect width="110" height="110" rx="28" fill="#1A2744"/>
                  <path d="M22 75 L22 50 Q22 28 44 28 L55 28" stroke="white" strokeWidth="11" strokeLinecap="round" fill="none"/>
                  <path d="M88 75 L88 50 Q88 28 66 28 L55 28" stroke="rgba(255,255,255,0.35)" strokeWidth="11" strokeLinecap="round" fill="none"/>
                  <line x1="30" y1="75" x2="80" y2="75" stroke="#E8893A" strokeWidth="9" strokeLinecap="round"/>
                  <circle cx="55" cy="28" r="6" fill="#E8893A"/>
                </svg>
                <span className="font-extrabold text-base text-text-primary tracking-tight" style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif" }}>Brixa</span>
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
          className={`bg-surface-50 p-4 md:p-6 ${signedIn ? 'min-h-[calc(100vh-56px)] md:min-h-screen pb-bottom-nav md:pb-6' : 'min-h-[calc(100vh-56px)]'}`}
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
