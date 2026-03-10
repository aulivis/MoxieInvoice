import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { StatusCell } from '@/components/ui/StatusCell';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RefreshInvoicesButton } from '@/components/invoices/RefreshInvoicesButton';
import { DeleteInvoiceButton } from '@/components/invoices/DeleteInvoiceButton';

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
    .select('id, external_id, moxie_invoice_id, status, error_message, created_at, pdf_url, total_amount, payload_snapshot')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function statusLabel(status: string) {
    if (status === 'failed') return t('statusFailed');
    if (status === 'created') return t('statusCreated');
    if (status === 'synced_to_moxie') return t('statusSynced');
    return status;
  }

  function formatAmount(amount: number | null | undefined, currency?: string) {
    if (amount == null) return '—';
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return currency ? `${formatted} ${currency}` : formatted;
  }

  const count = invoices?.length ?? 0;

  return (
    <div className="space-y-5 max-w-5xl animate-fade-in">
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
        {/* Mobile: card list */}
        <div className="divide-y divide-border-light md:hidden">
          {!invoices || invoices.length === 0 ? (
            <EmptyState
              title={t('empty')}
              ctaLabel={t('newInvoice')}
              ctaHref="/invoices/new"
            />
          ) : (
            invoices.map((inv, i) => (
              <article
                key={inv.id}
                className={`p-4 transition-colors opacity-0 animate-fade-up ${
                  inv.status === 'failed' ? 'bg-error-muted/20' : ''
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <p className="font-tabular-nums font-semibold text-sm text-text-primary">
                    {inv.external_id ?? inv.moxie_invoice_id ?? '—'}
                  </p>
                  <StatusCell status={inv.status} label={statusLabel(inv.status)} />
                </div>
                {(inv.total_amount != null || inv.payload_snapshot) && (
                  <p className="font-tabular-nums text-xs text-text-secondary mb-1">
                    {formatAmount(inv.total_amount ?? null, (inv.payload_snapshot as { currency?: string } | null)?.currency)}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-tabular-nums text-xs text-text-tertiary">
                    {formatDate(inv.created_at)}
                  </span>
                  <span className="flex items-center gap-2">
                    {inv.pdf_url && (
                      <Link
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded min-h-[32px]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('pdf')}
                      </Link>
                    )}
                    <DeleteInvoiceButton invoiceId={inv.id} status={inv.status} />
                  </span>
                </div>
                {inv.error_message && (
                  <details className="mt-2">
                    <summary className="text-xs text-status-error cursor-pointer hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded list-none flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {t('errorSummary')}
                    </summary>
                    <p className="mt-1.5 text-xs text-status-error break-words bg-error-muted/30 rounded p-2">
                      {inv.error_message}
                    </p>
                  </details>
                )}
              </article>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          {!invoices || invoices.length === 0 ? (
            <EmptyState
              title={t('empty')}
              ctaLabel={t('newInvoice')}
              ctaHref="/invoices/new"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-0 bg-surface-50 hover:bg-surface-50">
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('invoiceValue')}</TableHead>
                  <TableHead>{t('moxieInvoiceNumber')}</TableHead>
                  <TableHead>{t('errorColumn')}</TableHead>
                  <TableHead>{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv, i) => (
                  <TableRow
                    key={inv.id}
                    className={[
                      'opacity-0 animate-fade-up',
                      inv.status === 'failed' ? 'bg-error-muted/10 hover:bg-error-muted/20' : '',
                    ].join(' ')}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <TableCell className="font-tabular-nums text-text-secondary">
                      {formatDate(inv.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusCell status={inv.status} label={statusLabel(inv.status)} />
                    </TableCell>
                    <TableCell className="font-tabular-nums text-text-secondary">
                      {formatAmount(inv.total_amount ?? null, (inv.payload_snapshot as { currency?: string } | null)?.currency)}
                    </TableCell>
                    <TableCell className="font-tabular-nums font-medium">
                      {inv.external_id ?? inv.moxie_invoice_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-status-error max-w-xs">
                      {inv.error_message ? (
                        <details>
                          <summary className="cursor-pointer hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded list-none">
                            {t('errorSummary')}
                          </summary>
                          <p className="mt-1 break-words text-xs">
                            {inv.error_message}
                          </p>
                        </details>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {inv.pdf_url ? (
                          <Link
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded min-h-[36px]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('pdf')}
                          </Link>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                        <DeleteInvoiceButton invoiceId={inv.id} status={inv.status} />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
