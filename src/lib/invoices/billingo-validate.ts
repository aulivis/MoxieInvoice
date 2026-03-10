/**
 * Pre-validation for Billingo API requests.
 * Run before calling createBillingoInvoice; do not send to Billingo if valid is false.
 */

import type { NormalizedInvoiceRequest } from './types';

// Lazy-load messages to avoid pulling all locales into server bundle when only one is used
const getMessages = (locale: 'hu' | 'en') => {
  if (locale === 'en') {
    return require('../../messages/en.json').billingoValidation as BillingoValidationMessages;
  }
  return require('../../messages/hu.json').billingoValidation as BillingoValidationMessages;
};

interface BillingoValidationMessages {
  blocked: string;
  missingField: string;
  invalidValue: string;
  invalidValueWithDetail: string;
  fixAndRetry: string;
  fields: Record<string, string>;
}

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

/** Billingo accepts these payment_method values (whitelist). */
const ALLOWED_PAYMENT_METHODS = new Set([
  'bank_transfer',
  'cash',
  'bankcard',
  'coupon',
  'elore_utalas',
  'levonas',
  'postautalvany',
  'postai_csekk',
  'skrill',
  'barion',
]);

export interface BillingoValidationError {
  code: string;
  field?: string;
  value?: string;
}

export type BillingoValidationResult =
  | { valid: true }
  | { valid: false; errors: BillingoValidationError[] };

function empty(s: string | undefined): boolean {
  return s === undefined || String(s).trim() === '';
}

export function validateBillingoRequest(
  request: NormalizedInvoiceRequest
): BillingoValidationResult {
  const errors: BillingoValidationError[] = [];

  // --- Buyer (partner) ---
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

  // --- Dates ---
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

  // --- Currency ---
  if (empty(request.currency)) {
    errors.push({ code: 'MISSING_FIELD', field: 'currency' });
  }

  // --- Payment method (optional but if present must be allowed) ---
  if (
    request.paymentMethod !== undefined &&
    request.paymentMethod !== '' &&
    !ALLOWED_PAYMENT_METHODS.has(request.paymentMethod.trim().toLowerCase())
  ) {
    errors.push({
      code: 'INVALID_VALUE',
      field: 'paymentMethod',
      value: request.paymentMethod,
    });
  }

  // --- Items ---
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
 * Build a single, detailed user-facing message for Billingo validation errors in the given locale.
 * Used for error_message in DB and for API/UI responses.
 */
export function buildBillingoValidationMessage(
  errors: BillingoValidationError[],
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
