'use client';

import { useAuthSession } from '@/hooks/useAuthSession';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { BrixaLogoMark } from '@/components/BrixaLogoMark';

export function AppShell({ children }: { children: React.ReactNode }) {
  const signedIn = useAuthSession();
  const t = useTranslations('common');

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
            {/* Logo – visible on mobile when signed in (sidebar is hidden), always when signed out. Wordmark = icon height −10%. */}
            {(() => {
              const headerIconSize = 24;
              const wordmarkSize = headerIconSize * 0.9;
              const wordmarkStyle = { fontFamily: "var(--font-encode-sans-expanded), 'Encode Sans Expanded', sans-serif", fontWeight: 400, fontSize: `${wordmarkSize}px`, lineHeight: 1, color: 'var(--color-text-primary)' } as const;
              return signedIn ? (
                <span className="flex items-end gap-[1ch] md:hidden">
                  <BrixaLogoMark size={headerIconSize} />
                  <span style={wordmarkStyle}>Brixa</span>
                </span>
              ) : (
                <Link
                  href="/"
                  className="flex items-end gap-[1ch] hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md outline-none transition-opacity"
                >
                  <BrixaLogoMark size={headerIconSize} />
                  <span style={wordmarkStyle}>Brixa</span>
                </Link>
              );
            })()}
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
