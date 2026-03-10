/**
 * Pre-validation for Számlázz.hu API requests.
 * Run before calling createSzamlazzInvoice; do not send to Számlázz.hu if valid is false.
 * @see https://docs.szamlazz.hu/hu/agent/generating_invoice/xsd
 */

import type { NormalizedInvoiceRequest } from './types';

const getMessages = (locale: 'hu' | 'en') => {
  if (locale === 'en') {
    return require('../../messages/en.json').szamlazzValidation as SzamlazzValidationMessages;
  }
  return require('../../messages/hu.json').szamlazzValidation as SzamlazzValidationMessages;
};

interface SzamlazzValidationMessages {
  blocked: string;
  missingField: string;
  invalidValue: string;
  invalidValueWithDetail: string;
  fixAndRetry: string;
  fields: Record<string, string>;
}

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export interface SzamlazzValidationError {
  code: string;
  field?: string;
  value?: string;
}

export type SzamlazzValidationResult =
  | { valid: true }
  | { valid: false; errors: SzamlazzValidationError[] };

function empty(s: string | undefined): boolean {
  return s === undefined || String(s).trim() === '';
}

export function validateSzamlazzRequest(
  request: NormalizedInvoiceRequest
): SzamlazzValidationResult {
  const errors: SzamlazzValidationError[] = [];

  // --- Buyer (vevo: nev, irsz, telepules, cim required per XSD) ---
  if (empty(request.buyer.name)) {
    errors.push({ code: 'MISSING_FIELD', field: 'buyerName' });
  }
  if (empty(request.buyer.postCode)) {
    errors.push({ code: 'MISSING_FIELD', field: 'postCode' });
  }
  if (empty(request.buyer.city)) {
    errors.push({ code: 'MISSING_FIELD', field: 'city' });
  }
  if (empty(request.buyer.address)) {
    errors.push({ code: 'MISSING_FIELD', field: 'address' });
  }
  if (
    request.buyer.countryCode !== undefined &&
    empty(request.buyer.countryCode)
  ) {
    errors.push({ code: 'MISSING_FIELD', field: 'countryCode' });
  }

  // --- Dates (fejlec: teljesitesDatum, fizetesiHataridoDatum required) ---
  if (empty(request.fulfillmentDate)) {
    errors.push({ code: 'MISSING_FIELD', field: 'fulfillmentDate' });
  } else if (!DATE_YYYY_MM_DD.test(request.fulfillmentDate.trim())) {
    errors.push({
      code: 'INVALID_VALUE',
      field: 'fulfillmentDate',
      value: request.fulfillmentDate,
    });
  }
  if (
    request.dueDate !== undefined &&
    request.dueDate !== '' &&
    !DATE_YYYY_MM_DD.test(request.dueDate.trim())
  ) {
    errors.push({
      code: 'INVALID_VALUE',
      field: 'dueDate',
      value: request.dueDate,
    });
  }

  // --- Currency (penznem required) ---
  if (empty(request.currency)) {
    errors.push({ code: 'MISSING_FIELD', field: 'currency' });
  }

  // --- Items (tetelek: at least one tetel; megnevezes, mennyiseg, mennyisegiEgyseg, nettoEgysegar, afakulcs required) ---
  if (!request.items?.length) {
    errors.push({ code: 'MISSING_FIELD', field: 'items' });
  } else {
    request.items.forEach((item, index) => {
      if (empty(item.name)) {
        errors.push({
          code: 'MISSING_FIELD',
          field: 'itemName',
          value: String(index + 1),
        });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push({
          code: 'INVALID_VALUE',
          field: 'quantity',
          value: String(index + 1),
        });
      }
      if (
        typeof item.netUnitPrice !== 'number' ||
        item.netUnitPrice < 0 ||
        Number.isNaN(item.netUnitPrice)
      ) {
        errors.push({
          code: 'INVALID_VALUE',
          field: 'netUnitPrice',
          value: String(index + 1),
        });
      }
      if (
        typeof item.vatPercent !== 'number' ||
        item.vatPercent < 0 ||
        item.vatPercent > 100 ||
        Number.isNaN(item.vatPercent)
      ) {
        errors.push({
          code: 'INVALID_VALUE',
          field: 'vatPercent',
          value: String(index + 1),
        });
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Build a single, detailed user-facing message for Számlázz.hu validation errors in the given locale.
 * Used for error_message in DB and for API/UI responses.
 */
export function buildSzamlazzValidationMessage(
  errors: SzamlazzValidationError[],
  locale: 'hu' | 'en'
): string {
  const m = getMessages(locale);
  const lines: string[] = [m.blocked];
  for (const e of errors) {
    const fieldLabel = e.field ? (m.fields[e.field] ?? e.field) : '';
    if (e.code === 'MISSING_FIELD') {
      lines.push(m.missingField.replace('{field}', fieldLabel));
    } else if (e.code === 'INVALID_VALUE') {
      if (e.value !== undefined && e.value !== '') {
        lines.push(
          m.invalidValueWithDetail
            .replace('{field}', fieldLabel)
            .replace('{value}', e.value)
        );
      } else {
        lines.push(m.invalidValue.replace('{field}', fieldLabel));
      }
    }
  }
  lines.push(m.fixAndRetry);
  return lines.join(' ');
}
