'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const tabs = [
  { href: '/', key: 'dashboard' as const },
  { href: '/invoices', key: 'invoices' as const },
  { href: '/invoices/new', key: 'newInvoice' as const, isAction: true },
  { href: '/settings', key: 'settings' as const },
] as const;

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function InvoicesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const tabIcons: Record<string, React.ComponentType<{ active: boolean }>> = {
  dashboard: DashboardIcon,
  invoices: InvoicesIcon,
  settings: SettingsIcon,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background-card border-t border-border-light bottom-nav-safe"
      style={{ boxShadow: '0 -1px 0 #E0E0E0, 0 -8px 24px rgba(0,0,0,0.06)' }}
      aria-label="Mobile navigation"
    >
      <ul className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const { href, key } = tab;
          const isAction = 'isAction' in tab && tab.isAction;
          const isActive =
            !isAction &&
            (pathname === href || (href !== '/' && !href.includes('/new') && pathname.startsWith(href)));

          if (isAction) {
            return (
              <li key={href} className="flex-1 flex items-center justify-center">
                <Link
                  href={href}
                  aria-label={t(key)}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#E91E63] text-white shadow-fab hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
                >
                  <PlusIcon />
                </Link>
              </li>
            );
          }

          const Icon = tabIcons[key];

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex flex-col items-center justify-center h-full gap-1 text-xs font-semibold transition-colors outline-none',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isActive ? 'text-primary' : 'text-text-tertiary',
                ].join(' ')}
              >
                {Icon && <Icon active={isActive} />}
                <span>{t(key)}</span>
                {isActive && (
                  <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
