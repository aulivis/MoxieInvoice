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
    <fizetesiHatarido>${due}</fizetesiHatarido>
    <fizetesiMod>${request.paymentMethod === 'cash' ? 'Készpénz' : 'Átutalás'}</fizetesiMod>
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
  const pdfMatch = xml.match(/<pdf>([^<]*)<\/pdf>/i);
  return {
    invoiceNumber: numMatch ? numMatch[1].trim() : undefined,
    pdfUrl: pdfMatch ? pdfMatch[1].trim() : undefined,
  };
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

  return {
    externalId: parsed.invoiceNumber,
    invoiceNumber: parsed.invoiceNumber,
    pdfUrl: parsed.pdfUrl,
  };
}
