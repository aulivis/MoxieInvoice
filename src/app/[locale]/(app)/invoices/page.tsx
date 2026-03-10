import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { RefreshInvoicesButton } from '@/components/invoices/RefreshInvoicesButton';
import { InvoicesClientList } from '@/components/invoices/InvoicesClientList';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices');
  return { title: `${t('title')} – MoxieInvoice` };
}

export default async function InvoicesListPage() {
  const ctx = await getAppLayoutContext();
  const orgId = ctx?.profile?.organization_id;
  if (!orgId) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('invoices');
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, external_id, moxie_invoice_id, status, payment_status, error_message, created_at, pdf_url, total_amount, payload_snapshot')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  const count = invoices?.length ?? 0;

  return (
    <div className="space-y-5 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title">{t('title')}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {t('count', { count })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshInvoicesButton />
          <Link
            href="/invoices/new"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[#E91E63] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t('newInvoice')}
          </Link>
        </div>
      </div>

      {/* Invoices list */}
      <Card contentClassName="p-0">
        <InvoicesClientList invoices={invoices ?? []} locale={locale} />
      </Card>

      {/* Mobile FAB – above bottom nav */}
      <div className="fixed bottom-[80px] right-4 z-30 md:hidden">
        <Link
          href="/invoices/new"
          aria-label={t('newInvoice')}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[#E91E63] text-white shadow-fab hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
