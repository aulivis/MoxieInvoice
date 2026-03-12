import { NextResponse } from 'next/server';
import http from 'node:http';

// The MNB SOAP endpoint runs on HTTP (not HTTPS).
// The response contains HTML-encoded XML inside the SOAP body:
//   curr="EUR"&gt;384,86000&lt;/Rate&gt;
// We parse the EUR rate from that encoded string.
function fetchMnbCurrentRate(currency: string): Promise<number | null> {
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
          // Response contains HTML-encoded XML: curr="EUR"&gt;384,86000&lt;/Rate&gt;
          const escaped = `curr="${currency}"&gt;([^&]+)&lt;/Rate&gt;`;
          const match = text.match(new RegExp(escaped));
          if (!match) { resolve(null); return; }
          const rate = parseFloat(match[1].replace(',', '.'));
          resolve(isNaN(rate) ? null : rate);
        });
        res.on('error', () => resolve(null));
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(soapBody);
    req.end();
  });
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const [eur, usd] = await Promise.all([
    fetchMnbCurrentRate('EUR'),
    fetchMnbCurrentRate('USD'),
  ]);
  return NextResponse.json({ rate: eur, eur, usd });
}
