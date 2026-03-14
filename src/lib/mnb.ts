/**
 * MNB (Magyar Nemzeti Bank) árfolyam API – napi középárfolyam.
 * @see https://www.mnb.hu/statisztika/statisztikai-adatok-informaciok/adatok-idosorok/arfolyamok-lekerdezese
 */

import http from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';

const MNB_WSDL = 'https://www.mnb.hu/arfolyamok.asmx?WSDL';

/** Get cached rate from mnb_exchange_rates (1 unit = rate HUF). Returns null if not found. */
export async function getMnbRateFromDb(
  supabase: SupabaseClient,
  currency: string,
  date: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('mnb_exchange_rates')
    .select('rate')
    .eq('rate_date', date)
    .eq('currency', currency.toUpperCase())
    .maybeSingle();
  if (error || data == null) return null;
  const rate = Number(data.rate);
  return Number.isNaN(rate) ? null : rate;
}

/** Result of GetCurrentExchangeRates (MNB SOAP). Used by cron and optional API fallback. */
export interface MnbCurrentRates {
  eur: number | null;
  usd: number | null;
  rateDate: string | null;
}

/** MNB SOAP GetCurrentExchangeRates – HTTP (not HTTPS). For cron refresh. */
export function fetchMnbCurrentRates(): Promise<MnbCurrentRates> {
  return new Promise((resolve) => {
    const soapBody = Buffer.from(
      `<?xml version="1.0" encoding="utf-8"?>` +
        `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<soap:Body>` +
        `<GetCurrentExchangeRates xmlns="http://www.mnb.hu/webservices/">` +
        `</GetCurrentExchangeRates>` +
        `</soap:Body>` +
        `</soap:Envelope>`,
      'utf-8'
    );

    const req = http.request(
      {
        hostname: 'www.mnb.hu',
        path: '/arfolyamok.asmx',
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'http://www.mnb.hu/webservices/GetCurrentExchangeRates',
          'Content-Length': soapBody.byteLength,
        },
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let rateDate: string | null = null;
          const dayDateAttr = text.match(/&lt;Day\s+date="([^"]+)"|Day\s+date="([^"]+)"/);
          if (dayDateAttr) {
            const d = dayDateAttr[1] ?? dayDateAttr[2];
            if (d) rateDate = d.replace(/\./g, '-');
          }
          if (!rateDate) {
            const dayContent = text.match(/&lt;Day&gt;([^&]+)&lt;\/Day&gt;/);
            if (dayContent) {
              const d = dayContent[1].trim().replace(/\./g, '-');
              if (/^\d{4}-\d{2}-\d{2}$/.test(d)) rateDate = d;
            }
          }
          const parseRate = (currency: string): number | null => {
            const re = new RegExp(`curr="${currency}"&gt;([^&]+)&lt;/Rate&gt;`);
            const m = text.match(re);
            if (!m) return null;
            const rate = parseFloat(m[1].replace(',', '.'));
            return Number.isNaN(rate) ? null : rate;
          };
          resolve({
            eur: parseRate('EUR'),
            usd: parseRate('USD'),
            rateDate,
          });
        });
        res.on('error', () => resolve({ eur: null, usd: null, rateDate: null }));
      }
    );

    req.on('error', () => resolve({ eur: null, usd: null, rateDate: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ eur: null, usd: null, rateDate: null });
    });
    req.write(soapBody);
    req.end();
  });
}

/** Fetch rate from MNB SOAP API for a given date (1 unit = rate HUF). */
async function fetchMnbRateFromApi(currency: string, date: string): Promise<number> {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <GetExchangeRates xmlns="http://www.mnb.hu/webservices/">
      <startDate>${date}</startDate>
      <endDate>${date}</endDate>
      <currencyNames>${currency}</currencyNames>
    </GetExchangeRates>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch('https://www.mnb.hu/arfolyamok.asmx', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'http://www.mnb.hu/webservices/GetExchangeRates',
    },
    body: soapBody,
  });
  const text = await res.text();
  const rateMatch = text.match(/<Rate>([^<]+)<\/Rate>/);
  if (!rateMatch) throw new Error(`MNB: no rate for ${currency} on ${date}`);
  const rate = parseFloat(rateMatch[1].replace(',', '.'));
  if (Number.isNaN(rate)) throw new Error(`MNB: invalid rate ${rateMatch[1]}`);
  return rate;
}

/**
 * Get MNB rate for date (1 unit = rate HUF). If supabase given, uses cache first, then MNB API fallback.
 */
export async function getMnbRate(
  currency: string,
  date: string,
  supabase?: SupabaseClient
): Promise<number> {
  if (supabase) {
    const cached = await getMnbRateFromDb(supabase, currency, date);
    if (cached != null) return cached;
  }
  return fetchMnbRateFromApi(currency, date);
}
