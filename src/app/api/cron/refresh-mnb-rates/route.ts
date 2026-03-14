import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fetchMnbCurrentRates } from '@/lib/mnb';

const BUDAPEST_TZ = 'Europe/Budapest';

function isWeekendInBudapest(date: Date): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUDAPEST_TZ,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron: refresh MNB exchange rates in DB.
 * Runs at 11:00 and 23:00 UTC on weekdays (≈ 12:00 and 0:00 Budapest). Skips on weekend.
 * Purges rates older than 30 days.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  if (isWeekendInBudapest(now)) {
    return NextResponse.json({ ok: true, skipped: 'weekend' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const { eur, usd, rateDate } = await fetchMnbCurrentRates();

  if (!rateDate || (eur == null && usd == null)) {
    return NextResponse.json({ ok: true, updated: 0, error: 'No rates from MNB' });
  }

  const rows: { rate_date: string; currency: string; rate: number }[] = [];
  if (eur != null) rows.push({ rate_date: rateDate, currency: 'EUR', rate: eur });
  if (usd != null) rows.push({ rate_date: rateDate, currency: 'USD', rate: usd });

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from('mnb_exchange_rates').upsert(rows, {
      onConflict: 'rate_date,currency',
    });
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { error: deleteError } = await supabase
    .from('mnb_exchange_rates')
    .delete()
    .lt('rate_date', cutoffStr);

  if (deleteError) {
    return NextResponse.json({ ok: true, updated: rows.length, purgeError: deleteError.message });
  }

  return NextResponse.json({ ok: true, updated: rows.length, rateDate });
}
