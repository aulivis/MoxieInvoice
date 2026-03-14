'use client';

import { useState, useEffect, useActionState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { saveBillingAction, type SettingsState } from '@/app/actions/settings';
import { getSettingsErrorKey } from '@/lib/settings-errors';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConnectionStatusBadge } from '@/components/ui/ConnectionStatusBadge';
import { Select } from '@/components/ui/Select';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

export function BillingProviderForm({ hasSubscription = true, onSaved, wizardMode = false }: { hasSubscription?: boolean; onSaved?: () => void; wizardMode?: boolean }) {
  const [provider, setProvider] = useState<'billingo' | 'szamlazz'>('billingo');
  /** Provider the user is actually connected to (from API). Used for status message and right panel, not the dropdown. */
  const [connectedProvider, setConnectedProvider] = useState<'billingo' | 'szamlazz' | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [state, formAction] = useActionState<SettingsState | null, FormData>(saveBillingAction, null);
  const [defaultBlockId, setDefaultBlockId] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('hu');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('wire_transfer');
  const [defaultsFetched, setDefaultsFetched] = useState(false);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [billingoBlocks, setBillingoBlocks] = useState<Array<{ id: number; name: string; prefix: string }>>([]);
  const [billingoBlocksLoading, setBillingoBlocksLoading] = useState(false);
  const [billingoBlocksError, setBillingoBlocksError] = useState<string | null>(null);
  const [billingoDefaultBlockId, setBillingoDefaultBlockId] = useState<number | null>(null);
  const [billingoPaymentMethods, setBillingoPaymentMethods] = useState<Array<{ value: string; label: string }>>([]);
  const [billingoLanguages, setBillingoLanguages] = useState<Array<{ value: string; label: string }>>([]);
  const [billingoOptionsLoading, setBillingoOptionsLoading] = useState(false);
  const [billingoSendByEmail, setBillingoSendByEmail] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [ipnCopied, setIpnCopied] = useState(false);
  const t = useTranslations('billing');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');
  const disabled = !hasSubscription;

  const displayActionError = state?.error
    ? (getSettingsErrorKey(state.error) ? tErrors(getSettingsErrorKey(state.error) as 'unauthorized') : state.error)
    : null;

  const fetchBilling = useCallback(() => {
    return fetch('/api/billing', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setFetched(true);
        if (data.provider) {
          setProvider(data.provider);
          setConnectedProvider(data.provider);
        }
        setHasCredentials(!!data.hasCredentials);
        setOrgId(data.orgId ?? null);
      })
      .catch(() => setFetched(true));
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  useEffect(() => {
    if (state?.success) {
      fetchBilling();
      onSaved?.();
    }
  }, [state?.success, fetchBilling, onSaved]);

  useEffect(() => {
    if (provider !== 'billingo') {
      setDefaultsFetched(true);
      setBillingoBlocks([]);
      setBillingoBlocksError(null);
      return;
    }
    setBillingoBlocksError(null);
    fetch('/api/settings/org')
      .then((r) => r.json())
      .then((d) => {
        const savedBlockId = d.default_invoice_block_id != null ? String(d.default_invoice_block_id) : '';
        if (savedBlockId) setDefaultBlockId(savedBlockId);
        if (d.default_invoice_language) setDefaultLanguage(d.default_invoice_language);
        if (d.default_payment_method) setDefaultPaymentMethod(d.default_payment_method);
        setBillingoSendByEmail(d.billingo_send_invoice_by_email === true);
        setDefaultsFetched(true);

        setBillingoBlocksLoading(true);
        setBillingoOptionsLoading(true);
        Promise.all([
          fetch('/api/billing/billingo-blocks', { cache: 'no-store' }).then((res) => res.json()),
          fetch('/api/billing/billingo-options', { cache: 'no-store' }).then((res) => res.json()),
        ])
          .then(([blocksData, optionsData]) => {
            setBillingoBlocksLoading(false);
            setBillingoOptionsLoading(false);
            if (blocksData.blocks?.length) {
              setBillingoBlocks(blocksData.blocks);
              if (blocksData.defaultBlockId != null) setBillingoDefaultBlockId(blocksData.defaultBlockId);
              if (!savedBlockId && blocksData.defaultBlockId != null) setDefaultBlockId(String(blocksData.defaultBlockId));
            }
            if (blocksData.errorCode) {
              setBillingoBlocksError(t(blocksData.errorCode as 'billingoNotConfigured' | 'billingoApiKeyMissing'));
            } else if (blocksData.error) {
              setBillingoBlocksError(blocksData.error);
            }
            if (optionsData.paymentMethods?.length) setBillingoPaymentMethods(optionsData.paymentMethods);
            if (optionsData.languages?.length) setBillingoLanguages(optionsData.languages);
          })
          .catch(() => {
            setBillingoBlocksLoading(false);
            setBillingoOptionsLoading(false);
            setBillingoBlocksError(t('blocksLoadError'));
          });
      })
      .catch(() => setDefaultsFetched(true));
  }, [provider, t]);

  const inputClass =
    'w-full rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 ' +
    (disabled ? disabledInputClass : '');
  const labelClass = 'block text-sm font-medium text-text-label mb-1';

  /** Status message shows the provider the user is connected to (from API); logo and link follow the dropdown. */
  const connectedLabel =
    (connectedProvider ?? provider) === 'billingo' ? t('statusConnectedBillingo') : t('statusConnectedSzamlazz');
  const statusBadge = (
    <ConnectionStatusBadge
      connected={hasCredentials}
      connectedLabel={connectedLabel}
      disconnectedLabel={t('statusDisconnected')}
    />
  );

  const providerHomeUrl = provider === 'billingo' ? 'https://www.billingo.hu' : 'https://www.szamlazz.hu';
  const openLabel = provider === 'billingo' ? t('openBillingo') : t('openSzamlazz');
  const logoSrc = provider === 'billingo' ? '/logos/billingo.svg' : '/logos/szamlazz.svg';

  function ExternalLinkIcon({ className }: { className?: string }) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
  }

  if (!fetched)
    return (
      <p className="text-text-secondary">{tCommon('loading')}</p>
    );

  const mainContent = (
    <>
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
              { value: 'billingo', label: t('providerBillingo') },
              { value: 'szamlazz', label: t('providerSzamlazz') },
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
        <Button type="submit" variant="primary" disabled={disabled}>
          {tCommon('save')}
        </Button>
        {displayActionError && <Alert variant="error">{displayActionError}</Alert>}
        {state?.success && <Alert variant="success">{t('saved')}</Alert>}
      </form>

      {provider === 'billingo' && !wizardMode && (
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
                    billingo_send_invoice_by_email: billingoSendByEmail,
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
              <p className="text-xs text-text-secondary mb-1.5">{t('defaultBlockIdHint')}</p>
              {billingoBlocksLoading && (
                <p className="text-sm text-text-secondary py-2">{t('blocksLoading')}</p>
              )}
              {billingoBlocksError && (
                <Alert variant="error" className="mb-2">{billingoBlocksError}</Alert>
              )}
              {billingoBlocks.length > 0 ? (
                <Select
                  id="default-block-id"
                  value={defaultBlockId}
                  options={(() => {
                    const opts = billingoBlocks.map((b) => ({
                      value: String(b.id),
                      label: [b.name, b.prefix].filter(Boolean).join(' — ') || `#${b.id}`,
                      ...(billingoDefaultBlockId === b.id ? { leading: '★' as const } : {}),
                    }));
                    if (defaultBlockId && !opts.some((o) => o.value === defaultBlockId)) {
                      opts.unshift({ value: defaultBlockId, label: `ID: ${defaultBlockId}` });
                    }
                    return opts;
                  })()}
                  onChange={(v) => setDefaultBlockId(v)}
                  disabled={disabled || billingoBlocksLoading}
                  aria-label={t('defaultBlockId')}
                  className="mt-1"
                />
              ) : (
                !billingoBlocksLoading && (
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
                )
              )}
            </div>
            <div>
              <label htmlFor="default-language" className={labelClass}>
                {t('defaultLanguage')}
              </label>
              {billingoOptionsLoading ? (
                <p className="text-sm text-text-secondary py-2">{t('optionsLoading')}</p>
              ) : billingoLanguages.length > 0 ? (
                <Select
                  id="default-language"
                  value={defaultLanguage}
                  options={billingoLanguages.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => setDefaultLanguage(v)}
                  disabled={disabled}
                  aria-label={t('defaultLanguage')}
                  className="mt-1"
                />
              ) : (
                <Select
                  id="default-language"
                  value={defaultLanguage}
                  options={[
                    { value: 'hu', label: t('languageHu') },
                    { value: 'en', label: t('languageEn') },
                  ]}
                  onChange={(v) => setDefaultLanguage(v)}
                  disabled={disabled}
                  aria-label={t('defaultLanguage')}
                  className="mt-1"
                />
              )}
            </div>
            <div>
              <label htmlFor="default-payment-method" className={labelClass}>
                {t('defaultPaymentMethod')}
              </label>
              {billingoOptionsLoading ? (
                <p className="text-sm text-text-secondary py-2">{t('optionsLoading')}</p>
              ) : billingoPaymentMethods.length > 0 ? (
                <Select
                  id="default-payment-method"
                  value={defaultPaymentMethod}
                  options={billingoPaymentMethods.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={setDefaultPaymentMethod}
                  disabled={disabled}
                  aria-label={t('defaultPaymentMethod')}
                  className="mt-1"
                />
              ) : (
                <Select
                  id="default-payment-method"
                  value={defaultPaymentMethod}
                  options={[
                    { value: 'wire_transfer', label: t('paymentMethodWireTransfer') },
                    { value: 'cash', label: t('paymentMethodCash') },
                    { value: 'bankcard', label: t('paymentMethodBankcard') },
                  ]}
                  onChange={setDefaultPaymentMethod}
                  disabled={disabled}
                  aria-label={t('defaultPaymentMethod')}
                  className="mt-1"
                />
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-border-light">
              <h4 className="text-sm font-semibold text-text-primary mb-2">{t('billingoSendByEmailTitle')}</h4>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingoSendByEmail}
                  onChange={(e) => setBillingoSendByEmail(e.target.checked)}
                  disabled={disabled}
                  className="mt-1 rounded border-border-medium text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-describedby="billingo-send-email-hint"
                />
                <span className="text-sm text-text-primary">{t('billingoSendByEmailLabel')}</span>
              </label>
              <p id="billingo-send-email-hint" className="text-xs text-text-secondary mt-1.5 ml-6">
                {t('billingoSendByEmailHint')}
              </p>
            </div>
            <Button type="submit" variant="primary" disabled={disabled || defaultsSaving}>
              {defaultsSaving ? tCommon('loading') : tCommon('save')}
            </Button>
            {defaultsSaved && <Alert variant="success">{t('saved')}</Alert>}
            {defaultsError && <Alert variant="error">{defaultsError}</Alert>}
          </form>
        </div>
      )}
    </>
  );

  const rightPanel = !wizardMode && (
    <div className="w-full min-w-0 flex flex-col items-start pt-6 lg:pt-8 lg:pl-8">
      <img src={logoSrc} alt="" className="h-[5.5rem] w-auto object-contain" width={220} height={88} />
      <a
        href={providerHomeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
      >
        {openLabel}
        <ExternalLinkIcon className="w-4 h-4 shrink-0" />
      </a>
    </div>
  );

  const ipnBlock = provider === 'szamlazz' && !wizardMode && orgId && (
    <div className="mt-8 pt-6 border-t border-border-light">
      <p className="text-sm text-text-secondary mb-1">{t('ipnUrl')}</p>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <code className="block bg-background-hover px-1.5 py-1 rounded text-xs font-mono text-text-primary break-all">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/webhooks/szamlazz-ipn?org=${orgId}`
              : `[APP_URL]/api/webhooks/szamlazz-ipn?org=${orgId}`}
          </code>
          <p className="text-xs text-text-secondary mt-1.5">{t('ipnHint')}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const url =
              typeof window !== 'undefined'
                ? `${window.location.origin}/api/webhooks/szamlazz-ipn?org=${orgId}`
                : '';
            if (url && navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(url);
              setIpnCopied(true);
              setTimeout(() => setIpnCopied(false), 2000);
            }
          }}
          className="mt-6 inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-md border border-border-medium bg-background-card text-text-secondary hover:bg-background-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title={ipnCopied ? t('ipnCopied') : t('copyIpnUrl')}
          aria-label={ipnCopied ? t('ipnCopied') : t('copyIpnUrl')}
        >
          {ipnCopied ? (
            <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      {wizardMode ? (
        mainContent
      ) : (
        <>
          <div className="flex flex-col lg:grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-10 items-stretch">
            <div className="min-w-0">{mainContent}</div>
            {rightPanel}
          </div>
          {ipnBlock}
        </>
      )}
    </div>
  );
}
