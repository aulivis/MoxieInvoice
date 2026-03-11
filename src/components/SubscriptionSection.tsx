'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export function SubscriptionSection({ returnTo }: { returnTo?: string } = {}) {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  async function handleCheckout() {
    setError(null);
    setLoading('checkout');
    try {
      const body = returnTo ? JSON.stringify({ returnTo }) : undefined;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.errorCode ? tErrors(data.errorCode as 'checkoutFailed') : (data.error || tCommon('error'));
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

  return (
    <div className="space-y-3">
      <p className="text-text-secondary text-sm">{t('sectionDescription')}</p>
      <div className="flex gap-3 flex-wrap">
        <Button
          type="button"
          onClick={handleCheckout}
          disabled={!!loading}
          variant="primary"
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
