'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { StatusCell } from '@/components/ui/StatusCell';
import { PaymentStatusCell } from '@/components/ui/PaymentStatusCell';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteInvoiceButton } from '@/components/invoices/DeleteInvoiceButton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';

type InvoiceStatus = 'created' | 'synced_to_moxie' | 'failed';
type FilterValue = 'all' | InvoiceStatus;

interface Invoice {
  id: string;
  external_id: string | null;
  invoice_number: string | null;
  moxie_invoice_id: string | null;
  moxie_invoice_uuid: string | null;
  status: string;
  payment_status: 'open' | 'paid';
  error_message: string | null;
  created_at: string;
  pdf_url: string | null;
  total_amount: number | null;
  payload_snapshot: unknown;
  provider: 'billingo' | 'szamlazz';
}

interface Props {
  invoices: Invoice[];
  locale: string;
  moxieWebBaseUrl?: string;
  setupDone?: boolean;
}

const FILTERS: { value: FilterValue; labelKey: string }[] = [
  { value: 'all', labelKey: 'filterAll' },
  { value: 'created', labelKey: 'filterCreated' },
  { value: 'synced_to_moxie', labelKey: 'filterSynced' },
  { value: 'failed', labelKey: 'filterFailed' },
];

export function InvoicesClientList({ invoices, locale, moxieWebBaseUrl, setupDone }: Props) {
  const t = useTranslations('invoices');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  function toggleError(id: string) {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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

  function paymentStatusLabel(paymentStatus: 'open' | 'paid') {
    return paymentStatus === 'paid' ? t('paymentPaid') : t('paymentOpen');
  }

  function formatAmount(amount: number | null | undefined, currency?: string) {
    if (amount == null) return '—';
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return currency ? `${formatted} ${currency}` : formatted;
  }

  function getBuyerName(inv: Invoice): string | null {
    const snap = inv.payload_snapshot as { buyer?: { name?: string } } | null;
    const name = snap?.buyer?.name?.trim();
    return name || null;
  }

  /** Human-readable invoice number: prefer invoice_number, fall back to external_id. */
  function getInvoiceNumber(inv: Invoice): string {
    return inv.invoice_number ?? inv.external_id ?? '—';
  }

  /**
   * Public invoice URL: use the stored pdf_url which is Billingo's public_url
   * (the online invoice viewer) or the Számlázz.hu PDF link.
   * Never use the Billingo admin dashboard URL.
   */
  function getPublicUrl(inv: Invoice): string | null {
    return inv.pdf_url ?? null;
  }

  function getMoxieUrl(inv: Invoice): string | null {
    if (!inv.moxie_invoice_uuid || !moxieWebBaseUrl) return null;
    return `${moxieWebBaseUrl}/accounting/invoices#${inv.moxie_invoice_uuid}`;
  }

  function openInvoiceLabel(inv: Invoice): string {
    if (inv.provider === 'billingo') return t('openInBillingo');
    if (inv.provider === 'szamlazz') return t('openInSzamlazz');
    return t('openInBillingApp');
  }

  const statusCounts: Record<FilterValue, number> = {
    all: invoices.length,
    created: invoices.filter((i) => i.status === 'created').length,
    synced_to_moxie: invoices.filter((i) => i.status === 'synced_to_moxie').length,
    failed: invoices.filter((i) => i.status === 'failed').length,
  };

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3 border-b border-border-light">
        {FILTERS.map(({ value, labelKey }) => {
          const isActive = filter === value;
          const count = statusCounts[value];
          if (value !== 'all' && count === 0) return null;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface-50 text-text-secondary border-border-light hover:text-text-primary hover:border-border-medium',
              ].join(' ')}
            >
              {t(labelKey as Parameters<typeof t>[0])}
              <span className={[
                'text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                isActive ? 'bg-primary/15 text-primary' : 'bg-surface-100 text-text-tertiary',
              ].join(' ')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: card list */}
      <div className="divide-y divide-border-light md:hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? t('empty') : t('emptyFiltered')}
            ctaLabel={filter === 'all' ? t('newInvoice') : undefined}
            ctaHref={filter === 'all' && setupDone !== false ? '/invoices/new' : undefined}
          />
        ) : (
          filtered.map((inv, i) => {
            const publicUrl = getPublicUrl(inv);
            return (
              <article
                key={inv.id}
                className={`p-4 transition-colors opacity-0 animate-fade-up ${
                  inv.status === 'failed' ? 'bg-error-muted/20' : ''
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <p className="font-tabular-nums font-semibold text-sm text-text-primary">
                    {getInvoiceNumber(inv)}
                  </p>
                  <StatusCell status={inv.status} label={statusLabel(inv.status)} />
                </div>
                {getBuyerName(inv) && (
                  <p className="text-sm text-text-secondary mb-1 truncate" title={getBuyerName(inv) ?? undefined}>
                    {getBuyerName(inv)}
                  </p>
                )}
                <p className="flex items-center gap-1.5 mb-1">
                  <PaymentStatusCell
                    paymentStatus={inv.payment_status}
                    label={paymentStatusLabel(inv.payment_status)}
                  />
                </p>
                {(inv.total_amount != null || !!inv.payload_snapshot) && (
                  <p className="font-tabular-nums text-xs text-text-secondary mb-1">
                    {formatAmount(inv.total_amount ?? null, (inv.payload_snapshot as { currency?: string } | null)?.currency)}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-tabular-nums text-xs text-text-tertiary">
                    {formatDate(inv.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    {getMoxieUrl(inv) && (
                      <a
                        href={getMoxieUrl(inv)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                        aria-label={t('openInMoxie')}
                        title={t('openInMoxie')}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5z"/>
                        </svg>
                      </a>
                    )}
                    {publicUrl ? (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] text-primary hover:bg-primary/10 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label={openInvoiceLabel(inv)}
                        title={openInvoiceLabel(inv)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span
                        className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] text-text-tertiary"
                        aria-hidden
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </span>
                    )}
                    <DeleteInvoiceButton invoiceId={inv.id} status={inv.status} iconOnly />
                  </span>
                </div>
                {inv.error_message && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => toggleError(inv.id)}
                      className="inline-flex items-center gap-1 text-xs text-status-error hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {t('errorSummary')}
                      <svg
                        className={`w-3 h-3 transition-transform ${expandedErrors.has(inv.id) ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedErrors.has(inv.id) && (
                      <p className="mt-1.5 text-xs text-status-error break-words bg-error-muted/30 rounded p-2">
                        {inv.error_message}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? t('empty') : t('emptyFiltered')}
            ctaLabel={filter === 'all' ? t('newInvoice') : undefined}
            ctaHref={filter === 'all' && setupDone !== false ? '/invoices/new' : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-0 bg-surface-50 hover:bg-surface-50">
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('paymentStatus')}</TableHead>
                <TableHead>{t('buyerName')}</TableHead>
                <TableHead>{t('invoiceValue')}</TableHead>
                <TableHead>{t('invoiceNumber')}</TableHead>
                <TableHead>{t('action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv, i) => {
                const isExpanded = expandedErrors.has(inv.id);
                const publicUrl = getPublicUrl(inv);
                return (
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
                    <TableCell className="min-w-0 max-w-[200px]">
                      <div className="flex flex-col gap-1">
                        <StatusCell status={inv.status} label={statusLabel(inv.status)} />
                        {inv.status === 'failed' && inv.error_message && (
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleError(inv.id)}
                              className="inline-flex items-center gap-1 text-status-error hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded text-xs"
                            >
                              {t('errorSummary')}
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <p className="mt-1 break-words text-xs bg-error-muted/20 rounded p-2 text-status-error">
                                {inv.error_message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusCell
                        paymentStatus={inv.payment_status}
                        label={paymentStatusLabel(inv.payment_status)}
                      />
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-[160px]">
                      <span className="block truncate" title={getBuyerName(inv) ?? undefined}>
                        {getBuyerName(inv) ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="font-tabular-nums text-text-secondary">
                      {formatAmount(inv.total_amount ?? null, (inv.payload_snapshot as { currency?: string } | null)?.currency)}
                    </TableCell>
                    <TableCell className="font-tabular-nums font-medium" title={getInvoiceNumber(inv)}>
                      <span className="block max-w-[180px] truncate">
                        {getInvoiceNumber(inv)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {getMoxieUrl(inv) && (
                          <a
                            href={getMoxieUrl(inv)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2"
                            aria-label={t('openInMoxie')}
                            title={t('openInMoxie')}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5z"/>
                            </svg>
                          </a>
                        )}
                        {publicUrl ? (
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] text-primary hover:bg-primary/10 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={openInvoiceLabel(inv)}
                            title={openInvoiceLabel(inv)}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] text-text-tertiary"
                            aria-hidden
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </span>
                        )}
                        <DeleteInvoiceButton invoiceId={inv.id} status={inv.status} iconOnly />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
