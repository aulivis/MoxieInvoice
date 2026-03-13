import { NextResponse } from 'next/server';
import http from 'node:http';

// The MNB SOAP endpoint runs on HTTP (not HTTPS).
// Response contains HTML-encoded XML; we parse rates and the rate date (Day element).
function fetchMnbRates(): Promise<{ eur: number | null; usd: number | null; rateDate: string | null }> {
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
          // Day element: <Day date="2024-01-15"> or &lt;Day&gt;2024.01.15&lt;/Day&gt;
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

export const dynamic = 'force-dynamic';

export async function GET() {
  const { eur, usd, rateDate } = await fetchMnbRates();
  return NextResponse.json({ rate: eur, eur, usd, rateDate });
}
