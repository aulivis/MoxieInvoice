const BUDAPEST_TZ = 'Europe/Budapest';
const START_HOUR = 9;
const END_HOUR = 17; // exclusive: 9:00–16:59

/**
 * Returns true if support is currently available: weekday (Mon–Fri) 9:00–17:00 Budapest time.
 */
export function isSupportAvailable(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUDAPEST_TZ,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
  return isWeekday && hour >= START_HOUR && hour < END_HOUR;
}
