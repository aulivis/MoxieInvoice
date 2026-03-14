import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUDAPEST_TZ = 'Europe/Budapest';

function getEffectiveRateDate(now: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUDAPEST_TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
  if (weekday === 'Sat') d.setUTCDate(d.getUTCDate() - 1);
  else if (weekday === 'Sun') d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

export const dynamic = 'force-dynamic';

/**
 * Returns cached MNB rates from DB. On weekdays uses today (or latest available);
 * on weekend returns Friday's rate. No live MNB call – data is filled by cron.
 */
export async function GET() {
  const supabase = await createClient();
  const effectiveDate = getEffectiveRateDate(new Date());

  const { data: rows, error } = await supabase
    .from('mnb_exchange_rates')
    .select('rate_date, currency, rate')
    .lte('rate_date', effectiveDate)
    .order('rate_date', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json({ eur: null, usd: null, rateDate: null, rate: null });
  }

  const latestDate = rows[0].rate_date;
  const forDate = rows.filter((r) => r.rate_date === latestDate);
  const eur = forDate.find((r) => r.currency === 'EUR')?.rate ?? null;
  const usd = forDate.find((r) => r.currency === 'USD')?.rate ?? null;

  return NextResponse.json({
    rate: eur,
    eur,
    usd,
    rateDate: latestDate,
  });
}
