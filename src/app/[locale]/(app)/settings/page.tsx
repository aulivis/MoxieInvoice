import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getAppLayoutContext } from '@/lib/auth';
import { SettingsTabs } from '@/components/SettingsTabs';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings');
  return { title: `${t('title')} – Brixa` };
}

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const ctx = await getAppLayoutContext();
  const hasSubscription = ctx?.hasSubscription ?? false;

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <header>
        <h1 className="text-page-title">{t('title')}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t('description')}
        </p>
      </header>

      <SettingsTabs hasSubscription={hasSubscription} />
    </div>
  );
}
