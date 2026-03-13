'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';
import { ConnectionStatusBadge } from '@/components/ui/ConnectionStatusBadge';
import { BrixaLogoMark } from '@/components/BrixaLogoMark';

const navLinks = [
  { href: '/', key: 'dashboard' as const },
  { href: '/invoices', key: 'invoices' as const },
  { href: '/settings', key: 'settings' as const },
] as const;


function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function InvoicesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

const SIDEBAR_ICON_SIZE = 31;
function SidebarLogo() {
  return (
    <div className="flex items-end gap-[1ch]">
      <BrixaLogoMark size={SIDEBAR_ICON_SIZE} />
      <span
        style={{ color: 'var(--sidebar-text)', fontFamily: "var(--font-encode-sans-expanded), 'Encode Sans Expanded', sans-serif", fontWeight: 400, fontSize: `${SIDEBAR_ICON_SIZE * 0.9}px`, lineHeight: 1 }}
      >
        Brixa
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
  const [moxieLive, setMoxieLive] = useState(false);
  const [billingConfigured, setBillingConfigured] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/moxie/connection').then((r) => r.json()),
      fetch('/api/billing', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([moxieData, billingData]) => {
        setMoxieLive(!!moxieData?.connected && !!moxieData?.hasApiKey);
        setBillingConfigured(!!billingData?.provider && !!billingData?.hasCredentials);
      })
      .catch(() => {
        setMoxieLive(false);
        setBillingConfigured(false);
      });
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 z-50 h-full w-[240px] hidden md:flex flex-col"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="flex h-14 shrink-0 items-center px-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1628]"
        >
          <SidebarLogo />
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
            const showConnectionBadge = href === '/settings';
            const Icon = navIcons[key];

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[40px] text-sm font-medium outline-none',
                    'transition-colors duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1628]',
                    isActive ? 'sidebar-nav-active' : '',
                  ].join(' ')}
                  style={{
                    color: isActive ? '#E8893A' : 'rgba(255,255,255,0.5)',
                    background: isActive ? 'rgba(232,137,58,0.12)' : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '#1A2744';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = '';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                    }
                  }}
                >
                  {Icon && <Icon active={isActive} />}
                  <span>{t(key)}</span>
                  {showConnectionBadge && (
                    <span className="ml-auto shrink-0 flex items-center">
                      <ConnectionStatusBadge
                        connected={moxieLive && billingConfigured}
                        connectedLabel={tMoxie('statusConnected')}
                        disconnectedLabel={tMoxie('statusDisconnected')}
                        dotOnly
                        hasWarning={!moxieLive || !billingConfigured}
                        warningLabel={tMoxie('statusSetupIncomplete')}
                      />
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 p-3 border-t space-y-1"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
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
