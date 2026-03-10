'use client';

import { useState, useEffect, useActionState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { saveBillingAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

export function BillingProviderForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [provider, setProvider] = useState<'billingo' | 'szamlazz'>('billingo');
  const [sellerName, setSellerName] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [state, formAction] = useActionState<SettingsState | null, FormData>(saveBillingAction, null);
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');
  const disabled = !hasSubscription;

  const actionErrorKey: Record<string, string> = {
    'Unauthorized': 'unauthorized',
    'No organization': 'noOrganization',
    'Subscription required': 'subscriptionRequired',
  };
  const displayActionError = state?.error
    ? (actionErrorKey[state.error] ? tErrors(actionErrorKey[state.error] as 'unauthorized') : state.error)
    : null;

  const fetchBilling = useCallback(() => {
    return fetch('/api/billing', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setFetched(true);
        if (data.provider) setProvider(data.provider);
        if (data.sellerName != null) setSellerName(data.sellerName ?? '');
        setHasCredentials(!!data.hasCredentials);
      })
      .catch(() => setFetched(true));
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  useEffect(() => {
    if (state?.success) fetchBilling();
  }, [state?.success, fetchBilling]);

  const inputClass =
    'w-full rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 ' +
    (disabled ? disabledInputClass : '');
  const labelClass = 'block text-sm font-medium text-text-label mb-1';

  const statusBadge = hasCredentials ? (
    <Badge variant="green">{t('statusLive')}</Badge>
  ) : (
    <Badge variant="gray">{t('statusNotConfigured')}</Badge>
  );

  if (!fetched)
    return (
      <p className="text-text-secondary">{tCommon('loading')}</p>
    );

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      {disabled && (
        <p className="text-sm text-text-secondary mb-3" role="status">
          {tSub('guardTitle')}
        </p>
      )}
      <div className="flex items-center gap-2 mb-4">
        {statusBadge}
      </div>
      <form action={formAction} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="billing-provider" className={labelClass}>
            {t('provider')}
          </label>
          <select
            id="billing-provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'billingo' | 'szamlazz')}
            className={inputClass}
            disabled={disabled}
          >
            <option value="billingo">Billingo</option>
            <option value="szamlazz">Számlázz.hu</option>
          </select>
        </div>
        {provider === 'billingo' && (
          <div>
            <label htmlFor="billing-apiKey" className={labelClass}>
              {t('apiKey')}
            </label>
            <input id="billing-apiKey" type="password" name="apiKey" placeholder={t('agentKeyPlaceholder')} className={inputClass} disabled={disabled} />
          </div>
        )}
        {provider === 'szamlazz' && (
          <>
            <div>
              <label htmlFor="billing-agentKey" className={labelClass}>
                {t('agentKey')}
              </label>
              <input id="billing-agentKey" type="password" name="agentKey" placeholder={t('agentKeyPlaceholder')} className={inputClass} disabled={disabled} />
            </div>
            <div>
              <label htmlFor="billing-username" className={labelClass}>
                {t('usernamePlaceholder')}
              </label>
              <input id="billing-username" type="text" name="username" placeholder={t('usernamePlaceholder')} className={inputClass} disabled={disabled} />
            </div>
            <div>
              <label htmlFor="billing-password" className={labelClass}>
                {t('passwordPlaceholder')}
              </label>
              <input id="billing-password" type="password" name="password" placeholder={t('passwordPlaceholder')} className={inputClass} disabled={disabled} />
            </div>
          </>
        )}
        <div>
          <label htmlFor="billing-sellerName" className={labelClass}>
            {t('sellerName')}
          </label>
          <input
            id="billing-sellerName"
            type="text"
            name="sellerName"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className={inputClass}
            disabled={disabled}
          />
        </div>
        <Button type="submit" variant="primary" disabled={disabled}>
          {tCommon('save')}
        </Button>
        {displayActionError && <Alert variant="error">{displayActionError}</Alert>}
        {state?.success && <Alert variant="success">{t('saved')}</Alert>}
      </form>
    </div>
  );
}
