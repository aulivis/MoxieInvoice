/**
 * Számlázz.hu Számla Agent API adapter (XML).
 * @see https://docs.szamlazz.hu/hu/agent/basics/send-xml
 */

import type { NormalizedInvoiceRequest, InvoiceResult } from './types';

const SZAMLAZZ_ENDPOINT = 'https://www.szamlazz.hu/szamla/';

export interface SzamlazzCredentials {
  agentKey?: string;
  username?: string;
  password?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildXml(
  request: NormalizedInvoiceRequest,
  creds: SzamlazzCredentials
): string {
  const fulfillment = request.fulfillmentDate;
  const due = request.dueDate || fulfillment;
  const isProforma = request.invoiceType === 'proforma';

  const itemsXml = request.items
    .map((item) => {
      const net = item.quantity * item.netUnitPrice;
      const vat = net * (item.vatPercent / 100);
      const gross = net + vat;
      return `
    <tetel>
      <megnevezes>${escapeXml(item.name)}</megnevezes>
      <mennyiseg>${item.quantity}</mennyiseg>
      <mennyisegiEgyseg>${escapeXml(item.unit)}</mennyisegiEgyseg>
      <nettoEgysegar>${item.netUnitPrice}</nettoEgysegar>
      <afakulcs>${item.vatPercent}</afakulcs>
      <nettoErtek>${net}</nettoErtek>
      <afaErtek>${vat}</afaErtek>
      <bruttoErtek>${gross}</bruttoErtek>
    </tetel>`;
    })
    .join('');

  const authXml = creds.agentKey
    ? `<szamlaagentkulcs>${escapeXml(creds.agentKey)}</szamlaagentkulcs>`
    : `<felhasznalo>${escapeXml(creds.username || '')}</felhasznalo><jelszo>${escapeXml(creds.password || '')}</jelszo>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/docs/xsd/agent/xmlszamla.xsd">
  <beallitasok>
    ${authXml}
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <keltDatum>${fulfillment}</keltDatum>
    <teljesitesDatum>${fulfillment}</teljesitesDatum>
    <fizetesiHataridoDatum>${due}</fizetesiHataridoDatum>
    <fizmod>${request.paymentMethod === 'cash' ? 'Készpénz' : 'Átutalás'}</fizmod>
    <penznem>${request.currency}</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <tipus>${isProforma ? 'díjbekérő' : 'számla'}</tipus>
    ${request.comment ? `<megjegyzes>${escapeXml(request.comment)}</megjegyzes>` : ''}
  </fejlec>
  <vevo>
    <nev>${escapeXml(request.buyer.name)}</nev>
    <orszag>${request.buyer.countryCode || 'HU'}</orszag>
    <irsz>${escapeXml(request.buyer.postCode)}</irsz>
    <telepules>${escapeXml(request.buyer.city)}</telepules>
    <cim>${escapeXml(request.buyer.address)}</cim>
    ${request.buyer.email ? `<email>${escapeXml(request.buyer.email)}</email>` : ''}
    ${request.buyer.taxNumber ? `<adoszam>${escapeXml(request.buyer.taxNumber)}</adoszam>` : ''}
  </vevo>
  <tetelek>
    ${itemsXml}
  </tetelek>
</xmlszamla>`;
}

function parseResponseXml(xml: string): { invoiceNumber?: string; pdfUrl?: string; error?: string } {
  const errorMatch = xml.match(/<hiba(?:kód)?>([^<]*)<\/hiba(?:kód)?>/i) ?? xml.match(/<hiba>([^<]*)<\/hiba>/i);
  if (errorMatch) return { error: errorMatch[1].trim() };
  const numMatch = xml.match(/<szamlaszam>([^<]*)<\/szamlaszam>/i);
  // Official doc (valaszVerzio=2): <vevoifiokurl> contains the full viewer URL when vevői fiók is used.
  const vevoifiokurlMatch = xml.match(/<vevoifiokurl>([^<]*)<\/vevoifiokurl>/i);
  let pdfUrl: string | undefined;
  if (vevoifiokurlMatch) {
    const url = vevoifiokurlMatch[1].trim();
    if (url && url.startsWith('http')) pdfUrl = url;
  }
  // Fallback: szamlakulcsar/szamlakulcs + szamlaszam → printpreview URL (when API returns key but not vevoifiokurl).
  if (!pdfUrl) {
    const kulcsarMatch =
      xml.match(/<szamlakulcsar>([^<]*)<\/szamlakulcsar>/i) ??
      xml.match(/<szamlakulcs>([^<]*)<\/szamlakulcs>/i);
    if (numMatch && kulcsarMatch) {
      const szamlaszam = numMatch[1].trim();
      const kulcsar = kulcsarMatch[1].trim();
      if (szamlaszam && kulcsar) {
        pdfUrl = `https://www.szamlazz.hu/szamla/printpreview?szamlaszam=${encodeURIComponent(szamlaszam)}&keyman=${encodeURIComponent(kulcsar)}`;
      }
    }
  }
  return {
    invoiceNumber: numMatch ? numMatch[1].trim() : undefined,
    pdfUrl,
  };
}

/** Számlázz.hu payment status info returned by getSzamlazzDocument. */
export interface SzamlazzDocumentPaymentInfo {
  total: number;
  total_paid: number;
  _paid: boolean;
}

/**
 * Query payment status for an existing invoice via action-xmlszamlainformacio.
 * The invoice number is used as the identifier (external_id == invoice_number for Számlázz.hu).
 * Returns null on 404, auth error, or unexpected response.
 */
export async function getSzamlazzDocument(
  credentials: SzamlazzCredentials,
  invoiceNumber: string
): Promise<SzamlazzDocumentPaymentInfo | null> {
  const authXml = credentials.agentKey
    ? `<szamlaagentkulcs>${escapeXml(credentials.agentKey)}</szamlaagentkulcs>`
    : `<felhasznalo>${escapeXml(credentials.username || '')}</felhasznalo><jelszo>${escapeXml(credentials.password || '')}</jelszo>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlainformacio xmlns="http://www.szamlazz.hu/xmlszamlainformacio" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlainformacio https://www.szamlazz.hu/docs/xsd/agent/xmlszamlainformacio.xsd">
  <beallitasok>
    ${authXml}
    <szamlaszam>${escapeXml(invoiceNumber)}</szamlaszam>
  </beallitasok>
</xmlszamlainformacio>`;

  let text: string;
  try {
    const form = new FormData();
    form.append('action-xmlszamlainformacio', new Blob([xml], { type: 'application/xml' }));
    const res = await fetch(SZAMLAZZ_ENDPOINT, { method: 'POST', body: form });
    if (!res.ok) return null;
    text = await res.text();
  } catch {
    return null;
  }

  // Non-zero hibakod means an error (0 = success)
  const errorCodeMatch = text.match(/<hibakod>\s*([^<]*)\s*<\/hibakod>/i);
  if (errorCodeMatch && errorCodeMatch[1].trim() !== '0') return null;

  // Total amount: <brutto> can appear at top level or inside <alap>
  const bruttoMatch = text.match(/<brutto>\s*([^<]*)\s*<\/brutto>/i);
  const total = bruttoMatch ? Math.abs(Number(bruttoMatch[1].trim().replace(',', '.'))) : 0;

  // Sum all <osszeg> values inside <kifizetesek> payment records
  const paymentMatches = [...text.matchAll(/<osszeg>\s*([^<]*)\s*<\/osszeg>/gi)];
  const totalPaid = paymentMatches.reduce(
    (sum, m) => sum + Math.abs(Number(m[1].trim().replace(',', '.'))),
    0
  );

  const paid = total > 0 && totalPaid >= total;
  return { total, total_paid: totalPaid, _paid: paid };
}

/**
 * Returns true if the Számlázz.hu document is considered fully paid.
 */
export function isSzamlazzDocumentPaid(info: SzamlazzDocumentPaymentInfo): boolean {
  return info._paid || (info.total > 0 && info.total_paid >= info.total);
}

export async function createSzamlazzInvoice(
  credentials: SzamlazzCredentials,
  request: NormalizedInvoiceRequest
): Promise<InvoiceResult> {
  const xml = buildXml(request, credentials);
  const form = new FormData();
  form.append('action-xmlagentxmlfile', new Blob([xml], { type: 'application/xml' }));

  const res = await fetch(SZAMLAZZ_ENDPOINT, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  const parsed = parseResponseXml(text);

  if (parsed.error) {
    throw new Error(`Számlázz.hu: ${parsed.error}`);
  }
  if (!parsed.invoiceNumber) {
    throw new Error(`Számlázz.hu: No invoice number in response. ${text.slice(0, 500)}`);
  }

  // Use PDF URL from XML body (vevoifiokurl or printpreview); fallback to response header if present (doc: szlahu_vevoifiokurl).
  let pdfUrl = parsed.pdfUrl;
  if (!pdfUrl && res.headers) {
    const headerUrl =
      res.headers.get('szlahu_vevoifiokurl') ?? res.headers.get('Szlahu_Vevoifiokurl');
    if (headerUrl && headerUrl.trim().startsWith('http')) {
      pdfUrl = decodeURIComponent(headerUrl.trim());
    }
  }

  return {
    externalId: parsed.invoiceNumber,
    invoiceNumber: parsed.invoiceNumber,
    pdfUrl,
  };
}
