/**
 * Exchange rate resolution: MNB daily or manual org settings.
 * Used when request.targetCurrency !== request.currency to convert amounts before issuing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getMnbRate } from '@/lib/mnb';

export interface CurrencyOrgSettings {
  conversion_source: 'mnb_daily' | 'manual' | null;
  manual_eur_huf: number | null;
  manual_usd_huf: number | null;
  manual_usd_eur?: number | null;
  /** @deprecated use manual_eur_huf */
  fixed_eur_huf_rate?: number | null;
}

const SUPPORTED = ['EUR', 'HUF', 'USD'] as const;

function isSupported(c: string): c is (typeof SUPPORTED)[number] {
  return SUPPORTED.includes(c as (typeof SUPPORTED)[number]);
}

/**
 * Get exchange rate: 1 unit of `from` = rate units of `to`.
 * E.g. from=EUR, to=HUF => rate = HUF per 1 EUR.
 * When conversion_source is mnb_daily, pass supabase to use cached rates first.
 */
export async function getExchangeRate(
  from: string,
  to: string,
  date: string,
  orgSettings: CurrencyOrgSettings | null,
  supabase?: SupabaseClient
): Promise<number> {
  const fromNorm = from.toUpperCase();
  const toNorm = to.toUpperCase();
  if (fromNorm === toNorm) return 1;
  if (!isSupported(fromNorm) || !isSupported(toNorm)) {
    throw new Error(`Unsupported currency pair: ${from} -> ${to}`);
  }

  const source = orgSettings?.conversion_source ?? 'mnb_daily';

  if (source === 'manual') {
    const eurHuf = orgSettings?.manual_eur_huf ?? orgSettings?.fixed_eur_huf_rate;
    const usdHuf = orgSettings?.manual_usd_huf;
    const usdEur = orgSettings?.manual_usd_eur;
    // 1 EUR = eurHuf HUF, 1 USD = usdHuf HUF; optional 1 USD = usdEur EUR
    if (fromNorm === 'HUF' && toNorm === 'EUR') {
      if (eurHuf == null || eurHuf <= 0) throw new Error('Manual EUR-HUF rate not set');
      return 1 / eurHuf;
    }
    if (fromNorm === 'HUF' && toNorm === 'USD') {
      if (usdHuf == null || usdHuf <= 0) throw new Error('Manual USD-HUF rate not set');
      return 1 / usdHuf;
    }
    if (fromNorm === 'EUR' && toNorm === 'HUF') {
      if (eurHuf == null || eurHuf <= 0) throw new Error('Manual EUR-HUF rate not set');
      return eurHuf;
    }
    if (fromNorm === 'USD' && toNorm === 'HUF') {
      if (usdHuf == null || usdHuf <= 0) throw new Error('Manual USD-HUF rate not set');
      return usdHuf;
    }
    if (fromNorm === 'USD' && toNorm === 'EUR') {
      if (usdEur != null && usdEur > 0) return usdEur;
      if (eurHuf == null || usdHuf == null || eurHuf <= 0 || usdHuf <= 0)
        throw new Error('Manual USD-EUR or EUR-HUF and USD-HUF rates required for USD->EUR');
      return usdHuf / eurHuf;
    }
    if (fromNorm === 'EUR' && toNorm === 'USD') {
      if (usdEur != null && usdEur > 0) return 1 / usdEur;
      if (eurHuf == null || usdHuf == null || eurHuf <= 0 || usdHuf <= 0)
        throw new Error('Manual USD-EUR or EUR-HUF and USD-HUF rates required for EUR->USD');
      return eurHuf / usdHuf;
    }
  }

  // MNB: rates are "1 unit = X HUF" (cache first when supabase provided)
  const eurPerHuf = (): Promise<number> => getMnbRate('EUR', date, supabase).then((r) => 1 / r);
  const usdPerHuf = (): Promise<number> => getMnbRate('USD', date, supabase).then((r) => 1 / r);

  if (fromNorm === 'EUR' && toNorm === 'HUF') return getMnbRate('EUR', date, supabase);
  if (fromNorm === 'HUF' && toNorm === 'EUR') return eurPerHuf();
  if (fromNorm === 'USD' && toNorm === 'HUF') return getMnbRate('USD', date, supabase);
  if (fromNorm === 'HUF' && toNorm === 'USD') return usdPerHuf();
  if (fromNorm === 'EUR' && toNorm === 'USD') {
    const [eurHuf, usdHuf] = await Promise.all([
      getMnbRate('EUR', date, supabase),
      getMnbRate('USD', date, supabase),
    ]);
    return eurHuf / usdHuf;
  }
  if (fromNorm === 'USD' && toNorm === 'EUR') {
    const [eurHuf, usdHuf] = await Promise.all([
      getMnbRate('EUR', date, supabase),
      getMnbRate('USD', date, supabase),
    ]);
    return usdHuf / eurHuf;
  }

  throw new Error(`Unsupported pair: ${from} -> ${to}`);
}
