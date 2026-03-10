'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveOrgSettingsAction, type SettingsState } from '@/app/actions/settings';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

export function OrgSettingsForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [convertToHuf, setConvertToHuf] = useState(false);
  const [conversionSource, setConversionSource] = useState<'fixed' | 'mnb_daily'>('mnb_daily');
  const [fixedRate, setFixedRate] = useState('');
  const [scheduleType, setScheduleType] = useState<'always' | 'weekdays_only' | 'business_hours_only'>('always');
  const [timezone, setTimezone] = useState('Europe/Budapest');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [fetched, setFetched] = useState(false);
  const [state, formAction] = useActionState<SettingsState | null, FormData>(saveOrgSettingsAction, null);
  const t = useTranslations('orgSettings');
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
        if (d.currency_convert_to_huf != null) setConvertToHuf(d.currency_convert_to_huf);
        if (d.conversion_source) setConversionSource(d.conversion_source);
        if (d.fixed_eur_huf_rate != null) setFixedRate(String(d.fixed_eur_huf_rate));
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="currency_convert_to_huf"
              checked={convertToHuf}
              onChange={(e) => setConvertToHuf(e.target.checked)}
              className="rounded focus-visible:ring-2 focus-visible:ring-primary"
              disabled={disabled}
            />
            {t('convertLabel')}
          </label>
          {convertToHuf && (
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="conversion_source" value="fixed" checked={conversionSource === 'fixed'} onChange={() => setConversionSource('fixed')} className="focus-visible:ring-2 focus-visible:ring-primary" disabled={disabled} />
                {t('fixedRate')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="conversion_source" value="mnb_daily" checked={conversionSource === 'mnb_daily'} onChange={() => setConversionSource('mnb_daily')} className="focus-visible:ring-2 focus-visible:ring-primary" disabled={disabled} />
                {t('mnbDaily')}
              </label>
              {conversionSource === 'fixed' && (
                <input type="number" name="fixed_eur_huf_rate" step={0.01} placeholder="395" value={fixedRate} onChange={(e) => setFixedRate(e.target.value)} className={`mt-2 ${inputClass}`} disabled={disabled} />
              )}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-section-title mb-2">{t('scheduleTitle')}</h3>
          <select name="schedule_type" value={scheduleType} onChange={(e) => setScheduleType(e.target.value as typeof scheduleType)} className={inputClass} disabled={disabled}>
            <option value="always">{t('scheduleAlways')}</option>
            <option value="weekdays_only">{t('scheduleWeekdays')}</option>
            <option value="business_hours_only">{t('scheduleBusiness')}</option>
          </select>
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
