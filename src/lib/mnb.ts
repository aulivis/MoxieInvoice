/**
 * MNB (Magyar Nemzeti Bank) árfolyam API – napi középárfolyam.
 * @see https://www.mnb.hu/statisztika/statisztikai-adatok-informaciok/adatok-idosorok/arfolyamok-lekerdezese
 */

const MNB_WSDL = 'https://www.mnb.hu/arfolyamok.asmx?WSDL';

export async function getMnbRate(currency: string, date: string): Promise<number> {
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
