'use client';

import { useState, useEffect, useActionState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { saveBillingAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

const BILLINGO_PAYMENT_METHODS = [
  'bank_transfer',
  'cash',
  'bankcard',
  'elore_utalas',
  'levonas',
  'postautalvany',
  'postai_csekk',
  'coupon',
  'skrill',
  'barion',
] as const;

export function BillingProviderForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [provider, setProvider] = useState<'billingo' | 'szamlazz'>('billingo');
  const [sellerName, setSellerName] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [state, formAction] = useActionState<SettingsState | null, FormData>(saveBillingAction, null);
  const [defaultBlockId, setDefaultBlockId] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState<'hu' | 'en'>('hu');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('bank_transfer');
  const [defaultsFetched, setDefaultsFetched] = useState(false);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
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

  useEffect(() => {
    if (provider !== 'billingo') {
      setDefaultsFetched(true);
      return;
    }
    fetch('/api/settings/org')
      .then((r) => r.json())
      .then((d) => {
        if (d.default_invoice_block_id != null) setDefaultBlockId(String(d.default_invoice_block_id));
        if (d.default_invoice_language === 'hu' || d.default_invoice_language === 'en') setDefaultLanguage(d.default_invoice_language);
        if (d.default_payment_method) setDefaultPaymentMethod(d.default_payment_method);
        setDefaultsFetched(true);
      })
      .catch(() => setDefaultsFetched(true));
  }, [provider]);

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
          <Select
            id="billing-provider"
            name="provider"
            value={provider}
            options={[
              { value: 'billingo', label: 'Billingo' },
              { value: 'szamlazz', label: 'Számlázz.hu' },
            ]}
            onChange={(v) => setProvider(v as 'billingo' | 'szamlazz')}
            disabled={disabled}
            aria-label={t('provider')}
            className="mt-1"
          />
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

      {provider === 'billingo' && (
        <div className="mt-8 pt-6 border-t border-border-light">
          <h3 className="text-sm font-semibold text-text-primary mb-1">{t('invoiceDefaultsTitle')}</h3>
          <p className="text-xs text-text-secondary mb-4">{t('invoiceDefaultsHint')}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setDefaultsSaving(true);
              setDefaultsSaved(false);
              try {
                setDefaultsError(null);
                const res = await fetch('/api/settings/org', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    default_invoice_block_id: defaultBlockId ? Number(defaultBlockId) : null,
                    default_invoice_language: defaultLanguage,
                    default_payment_method: defaultPaymentMethod || null,
                  }),
                });
                if (res.ok) {
                  setDefaultsSaved(true);
                  setTimeout(() => setDefaultsSaved(false), 3000);
                } else {
                  const err = await res.json().catch(() => ({}));
                  const msg = typeof err?.error === 'string' ? err.error : t('saveFailed');
                  setDefaultsError(msg);
                }
              } finally {
                setDefaultsSaving(false);
              }
            }}
            className="space-y-4 max-w-lg"
          >
            <div>
              <label htmlFor="default-block-id" className={labelClass}>
                {t('defaultBlockId')}
              </label>
              <input
                id="default-block-id"
                type="number"
                min={1}
                value={defaultBlockId}
                onChange={(e) => setDefaultBlockId(e.target.value)}
                placeholder="1"
                className={inputClass}
                disabled={disabled}
              />
            </div>
            <div>
              <label htmlFor="default-language" className={labelClass}>
                {t('defaultLanguage')}
              </label>
              <Select<'hu' | 'en'>
                id="default-language"
                value={defaultLanguage}
                options={[
                  { value: 'hu', label: 'Magyar', leading: '🇭🇺' },
                  { value: 'en', label: 'English', leading: '🇬🇧' },
                ]}
                onChange={(v) => setDefaultLanguage(v)}
                disabled={disabled}
                aria-label={t('defaultLanguage')}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="default-payment-method" className={labelClass}>
                {t('defaultPaymentMethod')}
              </label>
              <Select
                id="default-payment-method"
                value={defaultPaymentMethod}
                options={BILLINGO_PAYMENT_METHODS.map((value) => ({
                  value,
                  label: value.replace(/_/g, ' '),
                }))}
                onChange={setDefaultPaymentMethod}
                disabled={disabled}
                aria-label={t('defaultPaymentMethod')}
                className="mt-1"
              />
            </div>
            <Button type="submit" variant="primary" disabled={disabled || defaultsSaving}>
              {defaultsSaving ? tCommon('loading') : tCommon('save')}
            </Button>
            {defaultsSaved && <Alert variant="success">{t('saved')}</Alert>}
            {defaultsError && <Alert variant="error">{defaultsError}</Alert>}
          </form>
        </div>
      )}
    </div>
  );
}
