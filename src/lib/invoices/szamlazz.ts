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
      <afakulcs>${String(item.vatPercent)}</afakulcs>
      <nettoErtek>${net}</nettoErtek>
      <afaErtek>${vat}</afaErtek>
      <bruttoErtek>${gross}</bruttoErtek>
    </tetel>`;
    })
    .join('');

  const authXml = creds.agentKey
    ? `<szamlaagentkulcs>${escapeXml(creds.agentKey)}</szamlaagentkulcs>`
    : `<felhasznalo>${escapeXml(creds.username || '')}</felhasznalo><jelszo>${escapeXml(creds.password || '')}</jelszo>`;

  const isHuf = request.currency === 'HUF';
  const fejlecMegjegyzes = request.comment ? `<megjegyzes>${escapeXml(request.comment)}</megjegyzes>` : '';
  const fejlecArfolyam = !isHuf ? `<arfolyamBank>MNB</arfolyamBank>
    <arfolyam>0.0</arfolyam>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
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
    ${fejlecMegjegyzes}
    ${fejlecArfolyam}
    <dijbekero>${isProforma}</dijbekero>
  </fejlec>
  <elado>
  </elado>
  <vevo>
    <nev>${escapeXml(request.buyer.name)}</nev>
    <orszag>${request.buyer.countryCode || 'HU'}</orszag>
    <irsz>${escapeXml(request.buyer.postCode)}</irsz>
    <telepules>${escapeXml(request.buyer.city)}</telepules>
    <cim>${escapeXml(request.buyer.address)}</cim>
    ${request.buyer.email ? `<email>${escapeXml(request.buyer.email)}</email>
    <sendEmail>false</sendEmail>` : ''}
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
 * Query payment status for an existing invoice via "Számla XML lekérés" (action-szamla_agent_xml).
 * Uses the documented API whose response includes <osszegek><totalossz><brutto> and <kifizetesek>.
 * The invoice number is used as the identifier (external_id == invoice_number for Számlázz.hu).
 * Returns null on 404, auth error, or unexpected response.
 * @see https://docs.szamlazz.hu/hu/agent/querying_xml/request
 * @see https://docs.szamlazz.hu/hu/agent/querying_xml/response
 */
export async function getSzamlazzDocument(
  credentials: SzamlazzCredentials,
  invoiceNumber: string
): Promise<SzamlazzDocumentPaymentInfo | null> {
  // Számla XML lekérés only documents agent key auth; username/password may not be supported for this action.
  const agentKey = credentials.agentKey?.trim();
  if (!agentKey) return null;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlaxml xmlns="http://www.szamlazz.hu/xmlszamlaxml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlaxml https://www.szamlazz.hu/szamla/docs/xsds/agentxml/xmlszamlaxml.xsd">
  <szamlaagentkulcs>${escapeXml(agentKey)}</szamlaagentkulcs>
  <szamlaszam>${escapeXml(invoiceNumber)}</szamlaszam>
  <rendelesSzam></rendelesSzam>
  <pdf></pdf>
  <szamlaKulsoAzon></szamlaKulsoAzon>
</xmlszamlaxml>`;

  let text: string;
  try {
    const form = new FormData();
    form.append('action-szamla_agent_xml', new Blob([xml], { type: 'application/xml' }));
    const res = await fetch(SZAMLAZZ_ENDPOINT, { method: 'POST', body: form });
    if (!res.ok) return null;
    text = await res.text();
  } catch {
    return null;
  }

  // Error: Hiba (7) or similar, or non-success response
  const hibaMatch = text.match(/<hiba[^>]*>([^<]*)<\/hiba>/i) ?? text.match(/Hiba\s*\(\d+\)/);
  if (hibaMatch) return null;
  const hibakodMatch = text.match(/<hibakod>\s*([^<]*)\s*<\/hibakod>/i);
  if (hibakodMatch && hibakodMatch[1].trim() !== '0') return null;

  // Total: <osszegek><totalossz><brutto> (documented response structure)
  const totalosszBlock = text.match(/<totalossz>\s*([\s\S]*?)<\/totalossz>/i);
  const bruttoMatch = totalosszBlock
    ? totalosszBlock[1].match(/<brutto>\s*([^<]*)\s*<\/brutto>/i)
    : text.match(/<brutto>\s*([^<]*)\s*<\/brutto>/i);
  const total = bruttoMatch
    ? Math.abs(Number(bruttoMatch[1].trim().replace(',', '.')))
    : 0;

  // Sum only <osszeg> inside <kifizetesek><kifizetes> to avoid matching other numeric elements
  const kifizetesekBlock = text.match(/<kifizetesek>\s*([\s\S]*?)<\/kifizetesek>/i);
  const block = kifizetesekBlock ? kifizetesekBlock[1] : '';
  const paymentMatches = [...block.matchAll(/<osszeg>\s*([^<]*)\s*<\/osszeg>/gi)];
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

/**
 * Fetch invoice/bizonylat PDF via "Bizonylat lekérése PDF-ben" (action-szamla_agent_pdf).
 * Returns the PDF as Buffer on success; null on auth error, not found, or other failure.
 * @see https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd
 */
export async function getSzamlazzPdf(
  credentials: SzamlazzCredentials,
  invoiceNumber: string
): Promise<Buffer | null> {
  const authXml = credentials.agentKey
    ? `<szamlaagentkulcs>${escapeXml(credentials.agentKey)}</szamlaagentkulcs>`
    : `<felhasznalo>${escapeXml(credentials.username || '')}</felhasznalo><jelszo>${escapeXml(credentials.password || '')}</jelszo>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlapdf xmlns="http://www.szamlazz.hu/xmlszamlapdf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlapdf https://www.szamlazz.hu/szamla/docs/xsds/agentpdf/xmlszamlapdf.xsd">
  ${authXml}
  <szamlaszam>${escapeXml(invoiceNumber)}</szamlaszam>
  <valaszVerzio>2</valaszVerzio>
</xmlszamlapdf>`;

  let text: string;
  try {
    const form = new FormData();
    form.append('action-szamla_agent_pdf', new Blob([xml], { type: 'application/xml' }));
    const res = await fetch(SZAMLAZZ_ENDPOINT, { method: 'POST', body: form });
    if (!res.ok) return null;
    text = await res.text();
  } catch {
    return null;
  }

  const sikeresMatch = text.match(/<sikeres>\s*(?:true|false)\s*<\/sikeres>/i);
  const sikeres = sikeresMatch && sikeresMatch[0].toLowerCase().includes('>true<');
  const pdfMatch = text.match(/<pdf>\s*([\s\S]*?)\s*<\/pdf>/i);
  const base64 = pdfMatch?.[1]?.trim().replace(/\s/g, '');

  if (!sikeres || !base64) return null;

  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
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
