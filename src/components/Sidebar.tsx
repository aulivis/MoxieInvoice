'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';

const navLinks = [
  { href: '/', key: 'dashboard' as const },
  { href: '/invoices', key: 'invoices' as const },
  { href: '/settings', key: 'settings' as const },
] as const;

const MOXIE_LIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Nav icons
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2 : 1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function InvoicesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2 : 1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2 : 1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={active ? 2 : 1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#E91E63] flex items-center justify-center shadow-sm">
        <span className="text-white text-sm font-bold leading-none">M</span>
      </div>
      <span className="font-bold text-base text-sidebar-text tracking-tight">
        MoxieInvoice
      </span>
    </div>
  );
}

const navIcons: Record<string, React.ComponentType<{ active: boolean }>> = {
  dashboard: DashboardIcon,
  invoices: InvoicesIcon,
  settings: SettingsIcon,
};

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tMoxie = useTranslations('moxie');
  const moxieLiveRef = useRef(false);

  useEffect(() => {
    fetch('/api/moxie/connection')
      .then((r) => r.json())
      .then((data) => {
        const at = data?.lastTestedAt;
        moxieLiveRef.current =
          !!data?.connected &&
          !!data?.hasApiKey &&
          !!at &&
          Date.now() - new Date(at).getTime() < MOXIE_LIVE_THRESHOLD_MS;
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 z-50 h-full w-[240px] hidden md:flex flex-col"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      aria-label="Main navigation"
    >
      {/* Logo area */}
      <div className="flex h-14 shrink-0 items-center px-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0D16]"
        >
          <LogoMark />
        </Link>
      </div>

      {/* Quick action */}
      <div className="mt-4 px-3">
        <Link
          href="/invoices/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[#E91E63] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0D16] outline-none shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {t('newInvoice')}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex flex-1 flex-col overflow-y-auto" aria-label="Main">
        <span className="text-sidebar-section px-4 mb-2">
          {t('menu')}
        </span>
        <ul className="flex flex-col gap-0.5 px-2">
          {navLinks.map(({ href, key }) => {
            const isActive =
              pathname === href || (href !== '/' && pathname.startsWith(href));
            const showMoxieLive = href === '/settings' && moxieLiveRef.current;
            const Icon = navIcons[key];

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[40px] text-sm font-medium outline-none',
                    'transition-colors duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0D16]',
                    isActive
                      ? 'sidebar-nav-active text-[#F06292]'
                      : 'text-[#9490A8] hover:text-[#E8E6F0]',
                  ].join(' ')}
                  style={isActive ? { background: 'var(--sidebar-active-bg)' } : {}}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                    }
                  }}
                >
                  {Icon && <Icon active={isActive} />}
                  <span>{t(key)}</span>
                  {showMoxieLive && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                      {tMoxie('statusConnected')}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar footer */}
      <div
        className="shrink-0 p-3 border-t space-y-1"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <div className="px-2">
          <LanguageSwitcher dark />
        </div>
        <div className="px-2">
          <HeaderAuth dark />
        </div>
      </div>
    </aside>
  );
}
