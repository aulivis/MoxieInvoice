import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAppLayoutContext } from '@/lib/auth';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { StatusCell } from '@/components/ui/StatusCell';
import { EmptyState } from '@/components/ui/EmptyState';

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

  // Fetch stats and recent invoices in parallel
  const [allResult, recentResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status')
      .eq('org_id', orgId),
    supabase
      .from('invoices')
      .select('id, external_id, status, error_message, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const all = allResult.data ?? [];
  const recent = recentResult.data ?? [];

  const total = all.length;
  const failed = all.filter((i) => i.status === 'failed').length;
  const success = total - failed;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  }

  function statusLabel(status: string) {
    if (status === 'failed') return tInvoices('statusFailed');
    if (status === 'created') return tInvoices('statusCreated');
    if (status === 'synced_to_moxie') return tInvoices('statusSynced');
    return status;
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">{t('title')}</h1>
        <Link
          href="/invoices/new"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[#E91E63] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {t('newInvoice')}
        </Link>
      </div>

      {/* Bento: Stats row */}
      <div className="grid grid-cols-3 gap-4 opacity-0 animate-fade-up">
        <StatCard
          label={t('statTotal')}
          value={total}
          accent="primary"
        />
        <StatCard
          label={t('statSuccessRate')}
          value={`${successRate}%`}
          trend={successRate >= 90 ? 'up' : successRate >= 70 ? 'neutral' : 'down'}
          accent="success"
        />
        <StatCard
          label={t('statFailed')}
          value={failed}
          trend={failed === 0 ? 'neutral' : 'down'}
          accent={failed > 0 ? 'error' : 'default'}
        />
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
              {recent.map((inv, i) => (
                <li
                  key={inv.id}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors opacity-0 animate-fade-up`}
                  style={{ animationDelay: `${(i + 2) * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-tabular-nums text-sm font-medium text-text-primary truncate">
                        {inv.external_id || inv.id.slice(0, 8) + '…'}
                      </span>
                      <StatusCell
                        status={inv.status}
                        label={statusLabel(inv.status)}
                      />
                    </div>
                    {inv.error_message && (
                      <p className="text-xs text-status-error mt-0.5 truncate max-w-sm" title={inv.error_message}>
                        {inv.error_message}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-text-tertiary font-tabular-nums">
                    {formatDate(inv.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Bottom row: Quick actions */}
      <div className="opacity-0 animate-fade-up-2">
        <Card variant="gradient" contentClassName="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-white text-base mb-1">{t('quickActionsTitle')}</p>
              <p className="text-sm text-white/70">{t('quickActionsDesc')}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary outline-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                {t('newInvoice')}
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 outline-none"
              >
                {t('settings')}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
