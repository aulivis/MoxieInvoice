'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { saveScheduleSettingsAction, type SettingsState } from '@/app/actions/settings';
import type { ScheduleType } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

// Derive schedule_type from the two dimensions
function toScheduleType(allDays: boolean, hasWindow: boolean): ScheduleType {
  if (allDays && hasWindow) return 'all_days_hours';
  if (allDays && !hasWindow) return 'always';
  if (!allDays && hasWindow) return 'business_hours_only';
  return 'weekdays_only';
}

// Parse saved schedule_type back into dimensions
function fromScheduleType(type: ScheduleType): { allDays: boolean; hasWindow: boolean } {
  return {
    allDays: type === 'always' || type === 'all_days_hours',
    hasWindow: type === 'business_hours_only' || type === 'all_days_hours',
  };
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function WeekdaysIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ScheduleForm({ hasSubscription = true }: { hasSubscription?: boolean }) {
  const [allDays, setAllDays] = useState(true);
  const [hasWindow, setHasWindow] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timezone, setTimezone] = useState('Europe/Budapest');
  const [fetched, setFetched] = useState(false);

  const [state, formAction] = useActionState<SettingsState | null, FormData>(
    saveScheduleSettingsAction,
    null
  );

  const t = useTranslations('scheduleSettings');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');

  const disabled = !hasSubscription;
  const scheduleType = toScheduleType(allDays, hasWindow);

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
    'rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-sm min-h-[40px] ' +
    'text-text-primary placeholder:text-text-disabled focus-visible:outline-none ' +
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 ' +
    (disabled ? 'disabled:opacity-60 disabled:cursor-not-allowed' : '');

  // Load saved settings
  useEffect(() => {
    fetch('/api/settings/org')
      .then((r) => r.json())
      .then((d) => {
        if (d.schedule_type) {
          const { allDays: a, hasWindow: h } = fromScheduleType(d.schedule_type as ScheduleType);
          setAllDays(a);
          setHasWindow(h);
        }
        if (d.start_time) setStartTime(d.start_time.slice(0, 5));
        if (d.end_time) setEndTime(d.end_time.slice(0, 5));
        if (d.timezone) setTimezone(d.timezone);
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

      <form action={formAction} className="space-y-6">
        {/* Hidden computed schedule_type */}
        <input type="hidden" name="schedule_type" value={scheduleType} />

        {/* Days dimension */}
        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            {t('daysLabel')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* All days card */}
            <button
              type="button"
              onClick={() => !disabled && setAllDays(true)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                allDays
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border-light bg-surface-50 text-text-secondary hover:border-primary/40 hover:text-text-primary',
              ].join(' ')}
              aria-pressed={allDays}
            >
              <span className={allDays ? 'text-primary' : 'text-text-tertiary'}>
                <CalendarIcon />
              </span>
              <div>
                <p className="text-sm font-semibold">{t('allDays')}</p>
                <p className="text-xs opacity-70 mt-0.5">{t('allDaysHint')}</p>
              </div>
            </button>

            {/* Weekdays only card */}
            <button
              type="button"
              onClick={() => !disabled && setAllDays(false)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                !allDays
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border-light bg-surface-50 text-text-secondary hover:border-primary/40 hover:text-text-primary',
              ].join(' ')}
              aria-pressed={!allDays}
            >
              <span className={!allDays ? 'text-primary' : 'text-text-tertiary'}>
                <WeekdaysIcon />
              </span>
              <div>
                <p className="text-sm font-semibold">{t('weekdaysOnly')}</p>
                <p className="text-xs opacity-70 mt-0.5">{t('weekdaysHint')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Time window dimension */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                {t('timeWindowLabel')}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">{t('timeWindowHint')}</p>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={hasWindow}
              onClick={() => !disabled && setHasWindow((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed opacity-60' : '',
                hasWindow ? 'bg-primary' : 'bg-border-medium',
              ].join(' ')}
              disabled={disabled}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm',
                  'transform transition duration-200 ease-in-out',
                  hasWindow ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>

          {hasWindow && (
            <div className="space-y-3 p-4 rounded-xl bg-surface-50 border border-border-light">
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                <ClockIcon />
                {t('timeRange')}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary mb-1 block">{t('startTime')}</label>
                  <input
                    type="time"
                    name="start_time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`${inputClass} w-full`}
                    disabled={disabled}
                  />
                </div>
                <span className="text-text-tertiary mt-5">–</span>
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary mb-1 block">{t('endTime')}</label>
                  <input
                    type="time"
                    name="end_time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`${inputClass} w-full`}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5 block">
            {t('timezone')}
          </label>
          <input
            type="text"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder={t('timezonePlaceholder')}
            className={`${inputClass} w-full`}
            disabled={disabled}
          />
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
