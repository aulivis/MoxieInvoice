'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveCurrencySettingsAction, type SettingsState } from '@/app/actions/settings';
import { getSettingsErrorKey } from '@/lib/settings-errors';
import { useSettingsFetch } from '@/hooks/useSettingsFetch';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

function formatRateDate(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

/** Canonical storage: 1 EUR = X HUF. Return canonical from display value + direction. */
function toCanonicalEurHuf(display: string, dir: 'eur_huf' | 'huf_eur'): number | null {
  const n = parseFloat(display.replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return dir === 'eur_huf' ? n : 1 / n;
}

function toCanonicalUsdHuf(display: string, dir: 'usd_huf' | 'huf_usd'): number | null {
  const n = parseFloat(display.replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return dir === 'usd_huf' ? n : 1 / n;
}

function toCanonicalUsdEur(display: string, dir: 'usd_eur' | 'eur_usd'): number | null {
  const n = parseFloat(display.replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return dir === 'usd_eur' ? n : 1 / n;
}

/** Format for display in the "other" direction (inverse of canonical). */
function fromCanonicalToDisplay(canonical: number | null, inverse: boolean): string {
  if (canonical == null || canonical <= 0) return '';
  const val = inverse ? 1 / canonical : canonical;
  if (val >= 1) return val.toFixed(2);
  if (val >= 0.01) return val.toFixed(4);
  return val.toFixed(6);
}

type DirEurHuf = 'eur_huf' | 'huf_eur';
type DirUsdHuf = 'usd_huf' | 'huf_usd';
type DirUsdEur = 'usd_eur' | 'eur_usd';

export function CurrencyForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [conversionSource, setConversionSource] = useState<'mnb_daily' | 'manual'>('mnb_daily');
  const [dirEurHuf, setDirEurHuf] = useState<DirEurHuf>('eur_huf');
  const [dirUsdHuf, setDirUsdHuf] = useState<DirUsdHuf>('usd_huf');
  const [dirUsdEur, setDirUsdEur] = useState<DirUsdEur>('usd_eur');
  const [displayEurHuf, setDisplayEurHuf] = useState('');
  const [displayUsdHuf, setDisplayUsdHuf] = useState('');
  const [displayUsdEur, setDisplayUsdEur] = useState('');
  const [liveRateEur, setLiveRateEur] = useState<number | null>(null);
  const [liveRateUsd, setLiveRateUsd] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const { data: orgData, fetched } = useSettingsFetch<Record<string, unknown>>('/api/settings/org');
  useEffect(() => {
    if (!orgData) return;
    const src = orgData.conversion_source === 'manual' ? 'manual' : 'mnb_daily';
    setConversionSource(src);
    const eurHuf = orgData.manual_eur_huf ?? orgData.fixed_eur_huf_rate;
    const usdHuf = orgData.manual_usd_huf;
    const usdEur = orgData.manual_usd_eur;
    setDisplayEurHuf(eurHuf != null ? String(eurHuf) : '');
    setDisplayUsdHuf(usdHuf != null ? String(usdHuf) : '');
    setDisplayUsdEur(usdEur != null ? String(usdEur) : '');
    setDirEurHuf('eur_huf');
    setDirUsdHuf('usd_huf');
    setDirUsdEur('usd_eur');
  }, [orgData]);

  const [state, formAction] = useActionState<SettingsState | null, FormData>(
    saveCurrencySettingsAction,
    null
  );

  const t = useTranslations('currencySettings');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');

  const disabled = !hasSubscription;

  const displayActionError = state?.error
    ? (getSettingsErrorKey(state.error)
        ? tErrors(getSettingsErrorKey(state.error) as 'unauthorized')
        : state.error)
    : null;

  const inputClass =
    'rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] ' +
    'text-text-primary placeholder:text-text-disabled focus-visible:outline-none ' +
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 ' +
    (disabled ? 'disabled:opacity-60 disabled:cursor-not-allowed' : '');

  const canonicalEurHuf = toCanonicalEurHuf(displayEurHuf, dirEurHuf);
  const canonicalUsdHuf = toCanonicalUsdHuf(displayUsdHuf, dirUsdHuf);
  const canonicalUsdEur = toCanonicalUsdEur(displayUsdEur, dirUsdEur);

  const switchDirEurHuf = () => {
    const can = toCanonicalEurHuf(displayEurHuf, dirEurHuf);
    setDirEurHuf((prev) => (prev === 'eur_huf' ? 'huf_eur' : 'eur_huf'));
    if (can != null) setDisplayEurHuf(fromCanonicalToDisplay(can, true));
  };
  const switchDirUsdHuf = () => {
    const can = toCanonicalUsdHuf(displayUsdHuf, dirUsdHuf);
    setDirUsdHuf((prev) => (prev === 'usd_huf' ? 'huf_usd' : 'usd_huf'));
    if (can != null) setDisplayUsdHuf(fromCanonicalToDisplay(can, true));
  };
  const switchDirUsdEur = () => {
    const can = toCanonicalUsdEur(displayUsdEur, dirUsdEur);
    setDirUsdEur((prev) => (prev === 'usd_eur' ? 'eur_usd' : 'usd_eur'));
    if (can != null) setDisplayUsdEur(fromCanonicalToDisplay(can, true));
  };

  // Fetch live MNB rates when MNB daily is selected (for preview + rate date)
  useEffect(() => {
    if (conversionSource !== 'mnb_daily') {
      setLiveRateEur(null);
      setLiveRateUsd(null);
      setRateDate(null);
      return;
    }
    setRateLoading(true);
    fetch('/api/settings/mnb-rate')
      .then((r) => r.json())
      .then((d) => {
        setLiveRateEur(d.eur ?? d.rate ?? null);
        setLiveRateUsd(d.usd ?? null);
        setRateDate(d.rateDate ?? null);
      })
      .catch(() => {
        setLiveRateEur(null);
        setLiveRateUsd(null);
        setRateDate(null);
      })
      .finally(() => setRateLoading(false));
  }, [conversionSource]);

  const segmentBase =
    'inline-flex flex-1 min-w-0 min-h-[44px] items-center justify-center px-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ';
  const segmentActive = 'bg-primary text-white';
  const segmentInactive =
    'bg-background-card text-text-secondary hover:bg-background-hover hover:text-text-primary';
  const outerRowClass = 'flex flex-1 min-w-0 min-h-[44px] rounded-lg border border-border-medium overflow-hidden';
  const toggleContainerClass = 'flex flex-1 min-w-0 min-h-[44px] bg-background-muted [&>button]:flex-1';

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
          <label className="flex flex-col cursor-pointer group p-3 rounded-lg border border-border-light hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="conversion_source"
                value="mnb_daily"
                checked={conversionSource === 'mnb_daily'}
                onChange={() => setConversionSource('mnb_daily')}
                className="accent-primary shrink-0"
                disabled={disabled}
              />
              <span className="text-sm font-medium text-text-primary">{t('mnbDaily')}</span>
            </div>
            <div className="mt-1 ml-7 min-w-0">
              <p className="text-xs text-text-tertiary">{t('mnbDailyHint')}</p>
              {conversionSource === 'mnb_daily' && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
                  {rateDate && (
                    <p className="text-xs text-text-secondary">
                      {t('mnbLastUpdate', { date: formatRateDate(rateDate) })}
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary">{t('mnbWeekendNote')}</p>
                </div>
              )}
            </div>
          </label>

          {/* Manual rates – direction toggle + input per pair */}
          <label className="flex flex-col cursor-pointer group p-3 rounded-lg border border-border-light hover:border-primary/40 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="conversion_source"
                value="manual"
                checked={conversionSource === 'manual'}
                onChange={() => setConversionSource('manual')}
                className="accent-primary shrink-0"
                disabled={disabled}
              />
              <span className="text-sm font-medium text-text-primary">{t('manualRate')}</span>
            </div>
            <div className="mt-1 ml-7 min-w-0">
              <p className="text-xs text-text-tertiary">{t('manualRateHint')}</p>
              {conversionSource === 'manual' && (
                <div className="mt-3 max-w-md space-y-4">
                  {/* EUR–HUF */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-0 max-w-[10rem]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                          {dirEurHuf === 'eur_huf' ? 'HUF' : 'EUR'}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          step={0.01}
                          placeholder={dirEurHuf === 'eur_huf' ? '395' : '0,00253'}
                          value={displayEurHuf}
                          onChange={(e) => setDisplayEurHuf(e.target.value)}
                          className={`${inputClass} pl-11 w-full`}
                          disabled={disabled}
                          aria-label={dirEurHuf === 'eur_huf' ? t('manualRateDir_eurToHuf') : t('manualRateDir_hufToEur')}
                        />
                      </div>
                      <div className={outerRowClass}>
                        <div className={toggleContainerClass} role="group" aria-label={t('manualRateDir_eurToHuf')}>
                        <button
                          type="button"
                          onClick={switchDirEurHuf}
                          className={dirEurHuf === 'eur_huf' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_eurToHuf')}
                        </button>
                        <button
                          type="button"
                          onClick={switchDirEurHuf}
                          className={dirEurHuf === 'huf_eur' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_hufToEur')}
                        </button>
                        </div>
                      </div>
                    </div>
                    <input type="hidden" name="manual_eur_huf" value={canonicalEurHuf != null ? String(canonicalEurHuf) : ''} />
                  </div>

                  {/* USD–HUF */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-0 max-w-[10rem]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                          {dirUsdHuf === 'usd_huf' ? 'HUF' : 'USD'}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={dirUsdHuf === 'usd_huf' ? '360' : '0,00278'}
                          value={displayUsdHuf}
                          onChange={(e) => setDisplayUsdHuf(e.target.value)}
                          className={`${inputClass} pl-11 w-full`}
                          disabled={disabled}
                          aria-label={dirUsdHuf === 'usd_huf' ? t('manualRateDir_usdToHuf') : t('manualRateDir_hufToUsd')}
                        />
                      </div>
                      <div className={outerRowClass}>
                        <div className={toggleContainerClass} role="group" aria-label={t('manualRateDir_usdToHuf')}>
                        <button
                          type="button"
                          onClick={switchDirUsdHuf}
                          className={dirUsdHuf === 'usd_huf' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_usdToHuf')}
                        </button>
                        <button
                          type="button"
                          onClick={switchDirUsdHuf}
                          className={dirUsdHuf === 'huf_usd' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_hufToUsd')}
                        </button>
                        </div>
                      </div>
                    </div>
                    <input type="hidden" name="manual_usd_huf" value={canonicalUsdHuf != null ? String(canonicalUsdHuf) : ''} />
                  </div>

                  {/* USD–EUR (optional) */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-border-light">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-0 max-w-[10rem]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium pointer-events-none">
                          {dirUsdEur === 'usd_eur' ? 'EUR' : 'USD'}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={dirUsdEur === 'usd_eur' ? '0,92' : '1,09'}
                          value={displayUsdEur}
                          onChange={(e) => setDisplayUsdEur(e.target.value)}
                          className={`${inputClass} pl-11 w-full`}
                          disabled={disabled}
                          aria-label={dirUsdEur === 'usd_eur' ? t('manualRateDir_usdToEur') : t('manualRateDir_eurToUsd')}
                        />
                      </div>
                      <div className={outerRowClass}>
                        <div className={toggleContainerClass} role="group" aria-label={t('manualRateDir_usdToEur')}>
                        <button
                          type="button"
                          onClick={switchDirUsdEur}
                          className={dirUsdEur === 'usd_eur' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_usdToEur')}
                        </button>
                        <button
                          type="button"
                          onClick={switchDirUsdEur}
                          className={dirUsdEur === 'eur_usd' ? `${segmentBase} ${segmentActive}` : `${segmentBase} ${segmentInactive}`}
                          disabled={disabled}
                        >
                          {t('manualRateDir_eurToUsd')}
                        </button>
                        </div>
                      </div>
                    </div>
                    <input type="hidden" name="manual_usd_eur" value={canonicalUsdEur != null ? String(canonicalUsdEur) : ''} />
                    <p className="text-xs text-text-tertiary">{t('manualUsdEurHint')}</p>
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
