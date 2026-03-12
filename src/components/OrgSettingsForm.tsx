'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveOrgSettingsAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

export function OrgSettingsForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [conversionSource, setConversionSource] = useState<'mnb_daily' | 'manual'>('mnb_daily');
  const [manualEurHuf, setManualEurHuf] = useState('');
  const [manualUsdHuf, setManualUsdHuf] = useState('');
  const [scheduleType, setScheduleType] = useState<'always' | 'weekdays_only' | 'business_hours_only'>('always');
  const [timezone, setTimezone] = useState('Europe/Budapest');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [fetched, setFetched] = useState(false);
  const [state, formAction] = useActionState<SettingsState | null, FormData>(saveOrgSettingsAction, null);
  const t = useTranslations('orgSettings');
  const tCur = useTranslations('currencySettings');
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

  const inputClass =
    'rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 w-full ' +
    (disabled ? disabledInputClass : '');

  useEffect(() => {
    fetch('/api/settings/org')
      .then((r) => r.json())
      .then((d) => {
        const src = d.conversion_source === 'manual' ? 'manual' : 'mnb_daily';
        setConversionSource(src);
        setManualEurHuf(d.manual_eur_huf != null ? String(d.manual_eur_huf) : (d.fixed_eur_huf_rate != null ? String(d.fixed_eur_huf_rate) : ''));
        setManualUsdHuf(d.manual_usd_huf != null ? String(d.manual_usd_huf) : '');
        if (d.schedule_type) setScheduleType(d.schedule_type);
        if (d.timezone) setTimezone(d.timezone);
        if (d.start_time) setStartTime(d.start_time.slice(0, 5));
        if (d.end_time) setEndTime(d.end_time.slice(0, 5));
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, []);

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      {disabled && (
        <p className="text-sm text-text-secondary mb-3" role="status">
          {tSub('guardTitle')}
        </p>
      )}
      <form action={formAction} className="space-y-4 max-w-lg">
        <div>
          <h3 className="text-section-title mb-2">{t('currencyTitle')}</h3>
          <p className="text-sm text-text-secondary mb-2">{tCur('sourceIntro')}</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conversion_source"
                value="mnb_daily"
                checked={conversionSource === 'mnb_daily'}
                onChange={() => setConversionSource('mnb_daily')}
                className="focus-visible:ring-2 focus-visible:ring-primary"
                disabled={disabled}
              />
              {tCur('mnbDaily')}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="conversion_source"
                value="manual"
                checked={conversionSource === 'manual'}
                onChange={() => setConversionSource('manual')}
                className="focus-visible:ring-2 focus-visible:ring-primary"
                disabled={disabled}
              />
              {tCur('manualRate')}
            </label>
            {conversionSource === 'manual' && (
              <div className="ml-6 mt-2 space-y-2">
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">{tCur('manualEurHuf')}</label>
                  <input
                    type="number"
                    name="manual_eur_huf"
                    step={0.01}
                    min={1}
                    placeholder="395"
                    value={manualEurHuf}
                    onChange={(e) => setManualEurHuf(e.target.value)}
                    className={inputClass}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">{tCur('manualUsdHuf')}</label>
                  <input
                    type="number"
                    name="manual_usd_huf"
                    step={0.01}
                    min={1}
                    placeholder="360"
                    value={manualUsdHuf}
                    onChange={(e) => setManualUsdHuf(e.target.value)}
                    className={inputClass}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-section-title mb-2">{t('scheduleTitle')}</h3>
          <Select
            name="schedule_type"
            value={scheduleType}
            options={[
              { value: 'always', label: t('scheduleAlways') },
              { value: 'weekdays_only', label: t('scheduleWeekdays') },
              { value: 'business_hours_only', label: t('scheduleBusiness') },
            ]}
            onChange={(v) => setScheduleType(v as typeof scheduleType)}
            disabled={disabled}
            aria-label={t('scheduleTitle')}
            className="mt-1"
          />
          {scheduleType === 'business_hours_only' && (
            <div className="mt-2 flex gap-2 items-center">
              <input type="time" name="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} disabled={disabled} />
              –
              <input type="time" name="end_time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} disabled={disabled} />
            </div>
          )}
          <input type="text" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={t('timezonePlaceholder')} className={`mt-2 w-full ${inputClass}`} disabled={disabled} />
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
