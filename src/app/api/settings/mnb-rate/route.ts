import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitResponse } from '@/lib/rate-limit';
import { fetchMnbCurrentRates } from '@/lib/mnb';

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
 * Returns MNB rates: from DB (last saved business day on or before effective date).
 * If DB has no rows, falls back to live MNB GetCurrentExchangeRates so the UI always gets a rate.
 */
export async function GET(request: Request) {
  const rateLimited = rateLimitResponse(request, 'api-settings-mnb-rate');
  if (rateLimited) return rateLimited;
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

  if (rows?.length) {
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

  const { eur, usd, rateDate } = await fetchMnbCurrentRates();
  return NextResponse.json({
    rate: eur ?? null,
    eur: eur ?? null,
    usd: usd ?? null,
    rateDate: rateDate ?? null,
  });
}
