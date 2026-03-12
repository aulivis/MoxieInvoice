import type { Metadata } from 'next';
import { getAppLayoutContext } from '@/lib/auth';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoicesNew');
  return { title: `${t('title')} – Brixa` };
}

export default async function NewInvoicePage() {
  const ctx = await getAppLayoutContext();
  const orgId = ctx?.profile?.organization_id;
  if (!orgId) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('invoicesNew');

  return (
    <div className="space-y-5 max-w-7xl animate-fade-in">
      <h1 className="text-page-title">{t('title')}</h1>
      <Card>
        <p className="text-text-secondary text-sm mb-4">
          Create invoices automatically via the Moxie integration, or use the list to manage existing invoices.
        </p>
        <Link
          href="/invoices"
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg min-h-[44px] px-5 py-2.5 text-base bg-primary text-primary-foreground hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('backToList')}
        </Link>
      </Card>
    </div>
  );
}
