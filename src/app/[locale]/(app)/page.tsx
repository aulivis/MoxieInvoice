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

function SetupStep({
  done,
  label,
  href,
  ariaLabelDone,
  ariaLabelMissing,
}: {
  done: boolean;
  label: string;
  href: string;
  ariaLabelDone: string;
  ariaLabelMissing: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
    >
      {done ? (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-status-success shrink-0" aria-label={ariaLabelDone}>
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-border-medium shrink-0" aria-label={ariaLabelMissing} />
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
      </div>

      {/* Setup wizard CTA — shown until all steps are done */}
      {!allSetupDone && (
        <div className="opacity-0 animate-fade-up">
        <div className="bg-background-card border rounded-xl p-5 animate-setup-glow"
          style={{ borderColor: 'rgba(232,137,58,0.35)', background: 'linear-gradient(135deg, rgba(232,137,58,0.04) 0%, rgba(255,255,255,1) 60%)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(232,137,58,0.12)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#E8893A" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('setupGuideTitle')}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <SetupStep done={hasSubscription} label={t('setupStep1')} href="/onboarding?step=subscription" ariaLabelDone={t('ariaStepDone')} ariaLabelMissing={t('ariaStepMissing')} />
                <SetupStep done={moxieConnected} label={t('setupStep2')} href="/onboarding?step=moxie" ariaLabelDone={t('ariaStepDone')} ariaLabelMissing={t('ariaStepMissing')} />
                <SetupStep done={billingConfigured} label={t('setupStep3')} href="/onboarding?step=billing" ariaLabelDone={t('ariaStepDone')} ariaLabelMissing={t('ariaStepMissing')} />
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/onboarding"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
              style={{ background: 'linear-gradient(135deg, #C96E22 0%, #F4A85C 100%)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('wizardCta')}
            </Link>
          </div>
        </div>
        </div>
      )}

      {/* KPI cards + recent invoices: blurred until setup is complete */}
      <div className={['space-y-6', !allSetupDone ? 'blur-sm pointer-events-none select-none' : ''].filter(Boolean).join(' ')}>

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

      </div>{/* end blur wrapper */}
    </div>
  );
}
