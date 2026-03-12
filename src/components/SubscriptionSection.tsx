'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type PriceInfo = {
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  formatted: string;
};

type PricesResponse = {
  monthly?: PriceInfo;
  yearly?: PriceInfo;
};

type SubscriptionDetailsDTO = {
  plan: 'monthly' | 'yearly';
  status: string;
  amount: number;
  currency: string;
  formatted: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
};

interface SubscriptionSectionProps {
  returnTo?: string;
  hasSubscription?: boolean;
}

export function SubscriptionSection({ returnTo, hasSubscription = false }: SubscriptionSectionProps) {
  const locale = useLocale();
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetailsDTO | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  useEffect(() => {
    let cancelled = false;
    setPricesLoading(true);
    setPricesError(null);
    fetch('/api/stripe/prices', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load prices');
        return res.json();
      })
      .then((data: PricesResponse) => {
        if (cancelled) return;
        setPrices(data);
        // Default selection: yearly if available (best value), else monthly
        const yearlyId = data.yearly?.priceId;
        const monthlyId = data.monthly?.priceId;
        setSelectedPriceId(yearlyId ?? monthlyId ?? null);
      })
      .catch((e) => {
        if (!cancelled) setPricesError(e instanceof Error ? e.message : tCommon('error'));
      })
      .finally(() => {
        if (!cancelled) setPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tCommon]);

  useEffect(() => {
    if (!hasSubscription) return;
    let cancelled = false;
    setDetailsLoading(true);
    setSubscriptionDetails(null);
    fetch('/api/stripe/subscription', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { subscription?: SubscriptionDetailsDTO | null; error?: string }) => {
        if (cancelled) return;
        setSubscriptionDetails(data.subscription ?? null);
      })
      .catch(() => {
        if (!cancelled) setSubscriptionDetails(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSubscription]);

  function formatBillingDate(unixSeconds: number): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(unixSeconds * 1000);
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      active: t('statusActive'),
      trialing: t('statusTrialing'),
      past_due: t('statusPastDue'),
      canceled: t('statusCanceled'),
      unpaid: t('statusCanceled'),
      incomplete: status,
      incomplete_expired: status,
    };
    return map[status] ?? status;
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-status-success/15 text-status-success';
      case 'trialing':
        return 'bg-status-info/15 text-status-info';
      case 'past_due':
        return 'bg-status-warning/15 text-status-warning';
      case 'canceled':
      case 'unpaid':
        return 'bg-text-tertiary/15 text-text-tertiary';
      default:
        return 'bg-border-medium text-text-secondary';
    }
  }

  async function handleCheckout() {
    const priceId = selectedPriceId ?? prices?.monthly?.priceId ?? prices?.yearly?.priceId;
    if (!priceId) {
      setError(tErrors('checkoutFailed'));
      return;
    }
    setError(null);
    setLoading('checkout');
    try {
      const body = JSON.stringify({ priceId, ...(returnTo ? { returnTo } : {}) });
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const text = await res.text();
      let data: { url?: string; error?: string; errorCode?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? tCommon('error') : tErrors('checkoutFailed'));
        return;
      }
      if (!res.ok) {
        const msg = data.errorCode
          ? tErrors(data.errorCode as 'checkoutFailed' | 'invalidPriceId')
          : (data.error || tCommon('error'));
        setError(msg);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError(tErrors('checkoutFailed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('error'));
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setError(null);
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const text = await res.text();
      let data: { url?: string; error?: string; errorCode?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? tCommon('error') : tErrors('portalFailed'));
        return;
      }
      if (!res.ok) {
        const msg = data.errorCode ? tErrors(data.errorCode as 'noSubscription' | 'portalFailed' | 'stripeCustomerInvalid') : (data.error || tCommon('error'));
        setError(msg);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError(tErrors('portalFailed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('error'));
    } finally {
      setLoading(null);
    }
  }

  // Already subscribed: show details or fallback to manage only
  if (hasSubscription) {
    if (detailsLoading) {
      return (
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="text-primary" />
          </div>
        </div>
      );
    }

    if (subscriptionDetails) {
      const d = subscriptionDetails;
      const planLabel = d.plan === 'yearly' ? t('planYearly') : t('planMonthly');
      const nextBillingDate = formatBillingDate(d.currentPeriodEnd);

      return (
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>

          <div className="rounded-xl border border-border-light border-l-4 border-l-primary bg-background-card p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-section-title text-text-primary">
                {t('currentPlan')}
              </h3>
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(d.status)}`}
                aria-label={getStatusLabel(d.status)}
              >
                {getStatusLabel(d.status)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-secondary">{planLabel}</span>
              <span className="text-metric-value font-tabular-nums text-text-primary">{d.formatted}</span>
            </div>
            <dl className="space-y-1.5 text-sm">
              {!d.cancelAtPeriodEnd ? (
                <div>
                  <dt className="text-text-tertiary">{t('nextBilling')}</dt>
                  <dd className="text-text-primary font-medium">
                    {t('renewsOn')} {nextBillingDate}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-text-tertiary">{t('cancelsOn')}</dt>
                  <dd className="text-text-primary font-medium">
                    {t('accessUntil')} {nextBillingDate}
                  </dd>
                  <p className="text-caption text-text-tertiary mt-1">
                    {t('manageSubscriptionHint')}
                  </p>
                </div>
              )}
              {!d.cancelAtPeriodEnd && (
                <p className="text-caption text-text-tertiary pt-1">
                  {t('manageSubscriptionHint')}
                </p>
              )}
            </dl>
            <div className="pt-2">
              <Button
                type="button"
                onClick={handlePortal}
                disabled={!!loading}
                variant="primary"
              >
                {loading === 'portal' ? tCommon('loading') : t('manage')}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-status-error text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }

    // Fallback: no details (404 / null) – show simple manage only
    return (
      <div className="space-y-3">
        <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            type="button"
            onClick={handlePortal}
            disabled={!!loading}
            variant="primary"
          >
            {loading === 'portal' ? tCommon('loading') : t('manage')}
          </Button>
        </div>
        {error && (
          <p className="text-status-error text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Loading prices
  if (pricesLoading) {
    return (
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="text-primary" />
        </div>
      </div>
    );
  }

  // Failed to load prices
  if (pricesError || (!prices?.monthly && !prices?.yearly)) {
    return (
      <div className="space-y-3">
        <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>
        <p className="text-status-error text-sm" role="alert">
          {pricesError ?? tErrors('checkoutFailed')}
        </p>
        <Button type="button" onClick={handlePortal} variant="secondary">
          {t('manage')}
        </Button>
      </div>
    );
  }

  const monthly = prices.monthly;
  const yearly = prices.yearly;

  return (
    <div className="space-y-4">
      <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>

      <div
        className="grid gap-4 sm:grid-cols-2"
        role="group"
        aria-label={t('sectionDescription')}
      >
        {monthly && (
          <button
            type="button"
            onClick={() => setSelectedPriceId(monthly.priceId)}
            className={`text-left rounded-xl border-2 p-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              selectedPriceId === monthly.priceId
                ? 'border-primary bg-primary/5 shadow-card'
                : 'border-border-light bg-background-card hover:border-border-medium hover:shadow-card'
            }`}
            aria-pressed={selectedPriceId === monthly.priceId}
            aria-label={`${t('planMonthly')} – ${monthly.formatted}`}
          >
            <div className="text-section-title text-text-primary">
              {t('planMonthly')}
            </div>
            <div className="mt-1 text-metric-value font-tabular-nums text-text-primary">
              {monthly.formatted}
            </div>
          </button>
        )}

        {yearly && (
          <button
            type="button"
            onClick={() => setSelectedPriceId(yearly.priceId)}
            className={`relative text-left rounded-xl border-2 p-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              selectedPriceId === yearly.priceId
                ? 'border-primary bg-primary/5 shadow-card'
                : 'border-border-light bg-background-card hover:border-border-medium hover:shadow-card'
            }`}
            aria-pressed={selectedPriceId === yearly.priceId}
            aria-label={`${t('planYearly')} – ${yearly.formatted} – ${t('twoMonthsFree')}`}
          >
            <span className="absolute top-3 right-3 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
              {t('bestValue')}
            </span>
            <div className="text-section-title text-text-primary pr-20">
              {t('planYearly')}
            </div>
            <div className="mt-1 text-xs font-semibold text-status-success">
              {t('twoMonthsFree')}
            </div>
            <div className="mt-1 text-metric-value font-tabular-nums text-text-primary">
              {yearly.formatted}
            </div>
          </button>
        )}
      </div>

      <p className="text-caption text-text-tertiary">
        {t('securePayment')}. {t('cancelAnytime')}.
      </p>

      <div className="flex gap-3 flex-wrap">
        <Button
          type="button"
          onClick={handleCheckout}
          disabled={!!loading || !selectedPriceId}
          variant="primary"
          loading={loading === 'checkout'}
        >
          {loading === 'checkout' ? tCommon('loading') : t('subscribe')}
        </Button>
        <Button
          type="button"
          onClick={handlePortal}
          disabled={!!loading}
          variant="secondary"
        >
          {loading === 'portal' ? tCommon('loading') : t('manage')}
        </Button>
      </div>

      {error && (
        <p className="text-status-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
