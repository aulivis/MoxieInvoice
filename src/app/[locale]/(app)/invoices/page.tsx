import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { RefreshInvoicesButton } from '@/components/invoices/RefreshInvoicesButton';
import { InvoicesClientList } from '@/components/invoices/InvoicesClientList';

/** Always fetch fresh invoice list so refresh button shows updated payment status from Billingo. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices');
  return { title: `${t('title')} – Brixa` };
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
  const [{ data: invoices }, { data: moxieConn }, { data: billingProvider }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, external_id, invoice_number, moxie_invoice_id, moxie_invoice_uuid, status, payment_status, error_message, created_at, pdf_url, total_amount, payload_snapshot, provider')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('moxie_connections')
      .select('base_url')
      .eq('org_id', orgId)
      .maybeSingle(),
    supabase
      .from('billing_providers')
      .select('provider')
      .eq('org_id', orgId)
      .maybeSingle(),
  ]);

  // Moxie web app is always at create.withmoxie.com regardless of which API pod is in use.
  const moxieWebBaseUrl = moxieConn?.base_url ? 'https://create.withmoxie.com' : undefined;
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
        </div>
      </div>

      {/* Invoices list */}
      <Card contentClassName="p-0">
        <InvoicesClientList invoices={invoices ?? []} locale={locale} moxieWebBaseUrl={moxieWebBaseUrl} />
      </Card>


    </div>
  );
}
