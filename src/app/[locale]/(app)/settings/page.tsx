import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getAppLayoutContext } from '@/lib/auth';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings');
  return { title: `${t('title')} – Brixa` };
}

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string }> | { tab?: string };
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const t = await getTranslations('settings');
  const ctx = await getAppLayoutContext();
  const hasSubscription = ctx?.hasSubscription ?? false;
  const orgId = ctx?.profile?.organization_id;

  const tOnboarding = await getTranslations('onboarding');

  const resolvedParams = await Promise.resolve(searchParams);
  const initialTab = resolvedParams?.tab === 'dataHandling' ? 'dataHandling' : undefined;

  let allSetupDone = false;
  if (orgId) {
    const supabase = await createClient();
    const [moxieResult, billingResult] = await Promise.all([
      supabase.from('moxie_connections').select('base_url').eq('org_id', orgId).maybeSingle(),
      supabase.from('billing_providers').select('provider').eq('org_id', orgId).maybeSingle(),
    ]);
    const moxieConnected = !!moxieResult.data?.base_url;
    const billingConfigured = !!billingResult.data?.provider;
    allSetupDone = hasSubscription && moxieConnected && billingConfigured;
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title">{t('title')}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t('description')}
          </p>
        </div>
        <Link
          href={allSetupDone ? '/onboarding?step=welcome' : '/onboarding'}
          className="shrink-0 hidden sm:inline-flex items-center gap-2 rounded-lg border border-border-medium bg-background-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {allSetupDone ? tOnboarding('restartButton') : tOnboarding('continueButton')}
        </Link>
      </header>

      <SettingsTabs hasSubscription={hasSubscription} initialTab={initialTab} />
    </div>
  );
}
