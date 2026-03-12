'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveCurrencySettingsAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function CurrencyForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [conversionSource, setConversionSource] = useState<'mnb_daily' | 'manual'>('mnb_daily');
  const [manualEurHuf, setManualEurHuf] = useState('');
  const [manualUsdHuf, setManualUsdHuf] = useState('');
  const [liveRateEur, setLiveRateEur] = useState<number | null>(null);
  const [liveRateUsd, setLiveRateUsd] = useState<number | null>(null);
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
        const src = d.conversion_source === 'manual' ? 'manual' : 'mnb_daily';
        setConversionSource(src);
        setManualEurHuf(d.manual_eur_huf != null ? String(d.manual_eur_huf) : (d.fixed_eur_huf_rate != null ? String(d.fixed_eur_huf_rate) : ''));
        setManualUsdHuf(d.manual_usd_huf != null ? String(d.manual_usd_huf) : '');
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, []);

  // Fetch live MNB rates when MNB daily is selected (for preview)
  useEffect(() => {
    if (conversionSource !== 'mnb_daily') {
      setLiveRateEur(null);
      setLiveRateUsd(null);
      return;
    }
    setRateLoading(true);
    fetch('/api/settings/mnb-rate')
      .then((r) => r.json())
      .then((d) => {
        setLiveRateEur(d.eur ?? d.rate ?? null);
        setLiveRateUsd(d.usd ?? null);
      })
      .catch(() => {
        setLiveRateEur(null);
        setLiveRateUsd(null);
      })
      .finally(() => setRateLoading(false));
  }, [conversionSource]);

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      {disabled && (
        <p className="text-sm text-text-secondary mb-3" role="status">
          {tSub('guardTitle')}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <p className="text-sm text-text-secondary">{t('sourceIntro')}</p>

        <div className="space-y-3">
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {rateLoading ? (
                    <span className="text-xs text-text-tertiary">{tCommon('loading')}</span>
                  ) : (
                    <>
                      {liveRateEur != null && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success bg-success-muted px-2 py-0.5 rounded-full">
                          {t('liveRateEur', { rate: liveRateEur.toLocaleString('hu-HU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                        </span>
                      )}
                      {liveRateUsd != null && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success bg-success-muted px-2 py-0.5 rounded-full">
                          {t('liveRateUsd', { rate: liveRateUsd.toLocaleString('hu-HU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                        </span>
                      )}
                      {!rateLoading && liveRateEur == null && liveRateUsd == null && (
                        <span className="text-xs text-text-tertiary">{t('rateUnavailable')}</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </label>

          {/* Manual rates */}
          <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-border-light hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="conversion_source"
              value="manual"
              checked={conversionSource === 'manual'}
              onChange={() => setConversionSource('manual')}
              className="mt-0.5 accent-primary"
              disabled={disabled}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary">{t('manualRate')}</span>
              <p className="text-xs text-text-tertiary mt-0.5">{t('manualRateHint')}</p>
              {conversionSource === 'manual' && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">{t('manualEurHuf')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                        HUF
                      </span>
                      <input
                        type="number"
                        name="manual_eur_huf"
                        step={0.01}
                        min={1}
                        placeholder="395"
                        value={manualEurHuf}
                        onChange={(e) => setManualEurHuf(e.target.value)}
                        className={`${inputClass} pl-12`}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary block mb-1">{t('manualUsdHuf')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                        HUF
                      </span>
                      <input
                        type="number"
                        name="manual_usd_huf"
                        step={0.01}
                        min={1}
                        placeholder="360"
                        value={manualUsdHuf}
                        onChange={(e) => setManualUsdHuf(e.target.value)}
                        className={`${inputClass} pl-12`}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>

        <Button type="submit" variant="primary" disabled={disabled || !fetched}>
          {tCommon('save')}
        </Button>

        {displayActionError && <Alert variant="error">{displayActionError}</Alert>}
        {state?.success && <Alert variant="success">{t('saved')}</Alert>}
      </form>
    </div>
  );
}
