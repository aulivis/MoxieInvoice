'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveCurrencySettingsAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function CurrencyForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [convertToHuf, setConvertToHuf] = useState(false);
  const [conversionSource, setConversionSource] = useState<'fixed' | 'mnb_daily'>('mnb_daily');
  const [fixedRate, setFixedRate] = useState('');
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [state, formAction] = useActionState<SettingsState | null, FormData>(
    saveCurrencySettingsAction,
    null
  );

  const t = useTranslations('currencySettings');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');

  const disabled = !hasSubscription;

  const actionErrorKey: Record<string, string> = {
    Unauthorized: 'unauthorized',
    'No organization': 'noOrganization',
    'Subscription required': 'subscriptionRequired',
  };
  const displayActionError = state?.error
    ? (actionErrorKey[state.error]
        ? tErrors(actionErrorKey[state.error] as 'unauthorized')
        : state.error)
    : null;

  const inputClass =
    'rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] ' +
    'text-text-primary placeholder:text-text-disabled focus-visible:outline-none ' +
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 w-full ' +
    (disabled ? 'disabled:opacity-60 disabled:cursor-not-allowed' : '');

  // Load saved settings
  useEffect(() => {
    fetch('/api/settings/org')
      .then((r) => r.json())
      .then((d) => {
        if (d.currency_convert_to_huf != null) setConvertToHuf(d.currency_convert_to_huf);
        if (d.conversion_source) setConversionSource(d.conversion_source);
        if (d.fixed_eur_huf_rate != null) setFixedRate(String(d.fixed_eur_huf_rate));
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, []);

  // Fetch live MNB rate when MNB daily is selected and convert is enabled
  useEffect(() => {
    if (!convertToHuf || conversionSource !== 'mnb_daily') {
      setLiveRate(null);
      return;
    }
    setRateLoading(true);
    fetch('/api/settings/mnb-rate')
      .then((r) => r.json())
      .then((d) => setLiveRate(d.rate ?? null))
      .catch(() => setLiveRate(null))
      .finally(() => setRateLoading(false));
  }, [convertToHuf, conversionSource]);

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      {disabled && (
        <p className="text-sm text-text-secondary mb-3" role="status">
          {tSub('guardTitle')}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        {/* EUR→HUF conversion toggle */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              name="currency_convert_to_huf"
              checked={convertToHuf}
              onChange={(e) => setConvertToHuf(e.target.checked)}
              className="h-4 w-4 rounded border-border-medium text-primary focus-visible:ring-2 focus-visible:ring-primary accent-primary"
              disabled={disabled}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
              {t('convertLabel')}
            </span>
            <p className="text-xs text-text-tertiary mt-0.5">{t('convertHint')}</p>
          </div>
        </label>

        {/* Conversion source selection */}
        {convertToHuf && (
          <div className="ml-7 space-y-3">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              {t('sourceLabel')}
            </p>

            {/* MNB Daily */}
            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-border-light hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="conversion_source"
                value="mnb_daily"
                checked={conversionSource === 'mnb_daily'}
                onChange={() => setConversionSource('mnb_daily')}
                className="mt-0.5 accent-primary"
                disabled={disabled}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-text-primary">{t('mnbDaily')}</span>
                <p className="text-xs text-text-tertiary mt-0.5">{t('mnbDailyHint')}</p>
                {conversionSource === 'mnb_daily' && (
                  <div className="mt-2 flex items-center gap-2">
                    {rateLoading ? (
                      <span className="text-xs text-text-tertiary">{tCommon('loading')}</span>
                    ) : liveRate !== null ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success bg-success-muted px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {t('liveRate', { rate: liveRate.toLocaleString('hu-HU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">{t('rateUnavailable')}</span>
                    )}
                  </div>
                )}
              </div>
            </label>

            {/* Fixed rate */}
            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-border-light hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="conversion_source"
                value="fixed"
                checked={conversionSource === 'fixed'}
                onChange={() => setConversionSource('fixed')}
                className="mt-0.5 accent-primary"
                disabled={disabled}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-text-primary">{t('fixedRate')}</span>
                <p className="text-xs text-text-tertiary mt-0.5">{t('fixedRateHint')}</p>
                {conversionSource === 'fixed' && (
                  <div className="mt-2 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                      HUF
                    </span>
                    <input
                      type="number"
                      name="fixed_eur_huf_rate"
                      step={0.01}
                      min={1}
                      placeholder="395"
                      value={fixedRate}
                      onChange={(e) => setFixedRate(e.target.value)}
                      className={`${inputClass} pl-12`}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        )}

        <Button type="submit" variant="primary" disabled={disabled || !fetched}>
          {tCommon('save')}
        </Button>

        {displayActionError && <Alert variant="error">{displayActionError}</Alert>}
        {state?.success && <Alert variant="success">{t('saved')}</Alert>}
      </form>
    </div>
  );
}
