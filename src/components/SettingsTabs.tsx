'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { SubscriptionSection } from '@/components/SubscriptionSection';
import { MoxieConnectionForm } from '@/components/MoxieConnectionForm';
import { BillingProviderForm } from '@/components/BillingProviderForm';
import { CurrencyForm } from '@/components/CurrencyForm';
import { ScheduleForm } from '@/components/ScheduleForm';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';

type TabKey = 'subscription' | 'moxie' | 'billing' | 'currency' | 'schedule';

interface SettingsTabsProps {
  hasSubscription: boolean;
}

function SubscriptionIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function MoxieIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ConfiguredDot() {
  return (
    <span className="w-2 h-2 rounded-full bg-status-success shrink-0" aria-hidden />
  );
}

export function SettingsTabs({ hasSubscription }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('subscription');
  const [moxieConnected, setMoxieConnected] = useState(false);
  const [billingConfigured, setBillingConfigured] = useState(false);
  const t = useTranslations('settings');

  useEffect(() => {
    fetch('/api/moxie/connection', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMoxieConnected(!!d.baseUrl))
      .catch(() => {});
    fetch('/api/billing', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setBillingConfigured(!!d.provider))
      .catch(() => {});
  }, []);

  const configuredMap: Record<TabKey, boolean> = {
    subscription: hasSubscription,
    moxie: moxieConnected,
    billing: billingConfigured,
    currency: false,
    schedule: false,
  };

  const tabs: { key: TabKey; labelKey: string; Icon: React.ComponentType }[] = [
    { key: 'subscription', labelKey: 'subscription', Icon: SubscriptionIcon },
    { key: 'moxie', labelKey: 'moxie', Icon: MoxieIcon },
    { key: 'billing', labelKey: 'billing', Icon: BillingIcon },
    { key: 'currency', labelKey: 'currency', Icon: CurrencyIcon },
    { key: 'schedule', labelKey: 'schedule', Icon: ScheduleIcon },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-border-light mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div className="flex gap-0 min-w-max sm:min-w-0">
          {tabs.map(({ key, labelKey, Icon }) => {
            const isActive = activeTab === key;
            const isConfigured = configuredMap[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'relative flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t-lg',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-medium',
                ].join(' ')}
                aria-selected={isActive}
                role="tab"
              >
                <Icon />
                <span className="hidden sm:inline">{t(labelKey as Parameters<typeof t>[0])}</span>
                {isConfigured && (
                  <span className="absolute top-1.5 right-1 flex">
                    <ConfiguredDot />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels — Card title removed to avoid duplication with tab label; same width as app pages (max-w-7xl) */}
      <div role="tabpanel" className="animate-fade-in">
        {activeTab === 'subscription' && (
          <Card>
            <SubscriptionSection hasSubscription={hasSubscription} />
          </Card>
        )}
        {activeTab === 'moxie' && (
          <Card>
            <MoxieConnectionForm hasSubscription={hasSubscription} />
          </Card>
        )}
        {activeTab === 'billing' && (
          <Card>
            <BillingProviderForm hasSubscription={hasSubscription} />
          </Card>
        )}
        {activeTab === 'currency' && (
          <Card>
            <CurrencyForm hasSubscription={hasSubscription} />
          </Card>
        )}
        {activeTab === 'schedule' && (
          <Card>
            <ScheduleForm hasSubscription={hasSubscription} />
          </Card>
        )}
      </div>

      {/* Mobile-only: language + logout (desktop has these in sidebar) */}
      <div className="mt-8 pt-6 border-t border-border-light md:hidden">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">{t('accountSection')}</p>
        <div className="space-y-2">
          <LanguageSwitcher />
          <HeaderAuth />
        </div>
      </div>
    </div>
  );
}
