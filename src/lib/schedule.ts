/**
 * Check if invoicing is allowed for org at given time (schedule: always / weekdays_only / business_hours_only).
 */
import { createClient } from '@supabase/supabase-js';

export async function isInvoicingAllowed(
  orgId: string,
  timestamp: Date = new Date()
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return true;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from('org_settings')
    .select('schedule_type, timezone, start_time, end_time')
    .eq('org_id', orgId)
    .maybeSingle();

  const scheduleType = data?.schedule_type ?? 'always';
  if (scheduleType === 'always') return true;

  const tz = data?.timezone ?? 'Europe/Budapest';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(timestamp);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const timeMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);

  if (scheduleType === 'weekdays_only') {
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    return !isWeekend;
  }

  if (scheduleType === 'business_hours_only') {
    const start = data?.start_time ?? '08:00';
    const end = data?.end_time ?? '17:00';
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    if (isWeekend) return false;
    return timeMinutes >= startMin && timeMinutes <= endMin;
  }

  return true;
}
