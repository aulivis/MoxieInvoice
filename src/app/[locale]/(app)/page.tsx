import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaymentStatusCell } from '@/components/ui/PaymentStatusCell';

// ── Icons for stat cards ────────────────────────────────────────────────────

function CashIcon() {
  return (
    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ── Setup step indicator ────────────────────────────────────────────────────

function SetupStep({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      {done ? (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-status-success shrink-0" aria-label="Kész">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-border-medium shrink-0" aria-label="Hiányzik" />
      )}
      <span className={`text-sm ${done ? 'text-text-tertiary line-through' : 'text-text-primary group-hover:text-primary transition-colors'}`}>
        {label}
      </span>
    </Link>
  );
}

// ── Currency formatter ───────────────────────────────────────────────────────

function formatCurrency(amount: number, locale: string): string {
  const isHu = locale === 'hu';
  return new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US', {
    style: 'currency',
    currency: isHu ? 'HUF' : 'EUR',
    maximumFractionDigits: isHu ? 0 : 2,
  }).format(amount);
}

export default async function HomePage() {
  const t = await getTranslations('dashboard');
  const tInvoices = await getTranslations('invoices');
  const ctx = await getAppLayoutContext();
  const orgId = ctx?.profile?.organization_id;
  if (!orgId) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const locale = await getLocale();
  const supabase = await createClient();
  const hasSubscription = ctx?.hasSubscription ?? false;

  // Fetch stats, recent invoices, and setup status in parallel
  const [allResult, recentResult, moxieResult, billingResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, total_amount, payment_status, created_at')
      .eq('org_id', orgId),
    supabase
      .from('invoices')
      .select('id, external_id, invoice_number, status, payment_status, error_message, created_at, total_amount, payload_snapshot')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('moxie_connections').select('base_url').eq('org_id', orgId).maybeSingle(),
    supabase.from('billing_providers').select('provider').eq('org_id', orgId).maybeSingle(),
  ]);

  const all = allResult.data ?? [];
  const recent = recentResult.data ?? [];
  const moxieConnected = !!moxieResult.data?.base_url;
  const billingConfigured = !!billingResult.data?.provider;

  const failed = all.filter((i) => i.status === 'failed').length;

  const outstandingAmount = all
    .filter((i) => i.payment_status === 'open' && i.status !== 'failed')
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const paidLast30Days = all
    .filter((i) => i.payment_status === 'paid' && i.created_at >= thirtyDaysAgo)
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0);

  const allSetupDone = hasSubscription && moxieConnected && billingConfigured;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">{t('title')}</h1>
        <Link
          href="/invoices/new"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none shadow-sm"
          style={{ background: 'linear-gradient(135deg, #C96E22 0%, #F4A85C 100%)', boxShadow: '0 4px 14px rgba(232,137,58,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {t('newInvoice')}
        </Link>
      </div>

      {/* Setup guide strip — hidden once all steps are done */}
      {!allSetupDone && (
        <div className="opacity-0 animate-fade-up bg-background-card border border-border-light rounded-xl px-5 py-4 shadow-subtle">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">{t('setupGuideTitle')}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <SetupStep done={hasSubscription} label={t('setupStep1')} href="/settings" />
            <span className="hidden sm:block text-border-medium">→</span>
            <SetupStep done={moxieConnected} label={t('setupStep2')} href="/settings" />
            <span className="hidden sm:block text-border-medium">→</span>
            <SetupStep done={billingConfigured} label={t('setupStep3')} href="/settings" />
          </div>
        </div>
      )}

      {/* Bento: Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="opacity-0 animate-fade-up">
          <StatCard
            label={t('statOutstanding')}
            value={formatCurrency(outstandingAmount, locale)}
            accent="primary"
            icon={<CashIcon />}
            iconBg="bg-amber-50"
          />
        </div>
        <div className="opacity-0 animate-fade-up delay-60">
          <StatCard
            label={t('statPaidMonth')}
            value={formatCurrency(paidLast30Days, locale)}
            trend="up"
            accent="success"
            icon={<TrendUpIcon />}
            iconBg="bg-emerald-50"
          />
        </div>
        <div className="opacity-0 animate-fade-up delay-120">
          <StatCard
            label={t('statFailed')}
            value={failed}
            trend={failed === 0 ? 'neutral' : 'down'}
            accent={failed > 0 ? 'error' : 'success'}
            icon={<XIcon />}
            iconBg={failed > 0 ? 'bg-red-50' : 'bg-emerald-50'}
          />
        </div>
      </div>

      {/* Recent invoices */}
      <div className="opacity-0 animate-fade-up-1">
        <Card
          title={t('recentInvoicesCount', { count: recent.length })}
          titleAction={
            <Link
              href="/invoices"
              className="text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded outline-none"
            >
              {t('viewAll')}
            </Link>
          }
          contentClassName="p-0"
        >
          {recent.length === 0 ? (
            <EmptyState
              title={t('noInvoices')}
              description={t('noInvoicesDesc')}
              ctaLabel={t('newInvoice')}
              ctaHref="/invoices/new"
            />
          ) : (
            <ul className="divide-y divide-border-light">
              {recent.map((inv, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const snapshot = inv.payload_snapshot as Record<string, any> | null;
                const clientName =
                  snapshot?.buyer?.name ??
                  snapshot?.partner?.name ??
                  snapshot?.client_name ??
                  inv.external_id ??
                  '–';
                const invoiceRef = inv.invoice_number ?? inv.external_id ?? '–';
                const paymentStatus = (inv.payment_status ?? 'open') as 'open' | 'paid';

                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors opacity-0 animate-fade-up"
                    style={{ animationDelay: `${(i + 2) * 50}ms` }}
                  >
                    {/* Left: client + ref + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{clientName}</p>
                      <p className="text-xs text-text-tertiary font-tabular-nums mt-0.5">
                        {invoiceRef !== '–' ? `${invoiceRef} · ` : ''}{formatDate(inv.created_at)}
                      </p>
                      {inv.status === 'failed' && inv.error_message && (
                        <p className="text-xs text-status-error mt-0.5 truncate max-w-sm" title={inv.error_message}>
                          {inv.error_message}
                        </p>
                      )}
                    </div>

                    {/* Middle: payment status */}
                    <PaymentStatusCell
                      paymentStatus={paymentStatus}
                      label={paymentStatus === 'paid' ? tInvoices('paymentPaid') : tInvoices('paymentOpen')}
                      className="shrink-0 text-xs"
                    />

                    {/* Right: amount */}
                    {inv.total_amount != null && (
                      <span className="shrink-0 text-sm font-semibold font-tabular-nums text-text-primary">
                        {formatCurrency(inv.total_amount, locale)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
