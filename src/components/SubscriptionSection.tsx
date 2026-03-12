'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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

interface SubscriptionSectionProps {
  returnTo?: string;
  hasSubscription?: boolean;
}

export function SubscriptionSection({ returnTo, hasSubscription = false }: SubscriptionSectionProps) {
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await res.json();
      if (!res.ok) {
        const msg = data.errorCode
          ? tErrors(data.errorCode as 'checkoutFailed' | 'invalidPriceId')
          : (data.error || tCommon('error'));
        throw new Error(msg);
      }
      if (data.url) window.location.href = data.url;
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
      const data = await res.json();
      if (!res.ok) {
        const msg = data.errorCode ? tErrors(data.errorCode as 'noSubscription') : (data.error || tCommon('error'));
        throw new Error(msg);
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : tCommon('error'));
    } finally {
      setLoading(null);
    }
  }

  // Already subscribed: only show manage
  if (hasSubscription) {
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
            <div className="font-display text-lg font-semibold text-text-primary">
              {t('planMonthly')}
            </div>
            <div className="mt-1 text-2xl font-bold text-text-primary">
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
            <span className="absolute top-3 right-3 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {t('bestValue')}
            </span>
            <div className="font-display text-lg font-semibold text-text-primary pr-20">
              {t('planYearly')}
            </div>
            <div className="mt-1 text-sm font-medium text-status-success">
              {t('twoMonthsFree')}
            </div>
            <div className="mt-1 text-2xl font-bold text-text-primary">
              {yearly.formatted}
            </div>
          </button>
        )}
      </div>

      <p className="text-xs text-text-tertiary">
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
