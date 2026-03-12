/**
 * Pre-validation for Billingo API requests.
 * Run before calling createBillingoInvoice; do not send to Billingo if valid is false.
 */

import type { NormalizedInvoiceRequest } from './types';
import { BILLINGO_ALLOWED_VAT_PERCENTS } from './types';
import { BILLINGO_LANGUAGES } from './billingo';

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
  missingFields: string;
  invalidValue: string;
  invalidValueWithDetail: string;
  fixAndRetry: string;
  fields: Record<string, string>;
}

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

/** Billingo v3 payment_method enum (from API spec). */
const ALLOWED_PAYMENT_METHODS = new Set([
  'aruhitel',
  'bankcard',
  'barion',
  'barter',
  'cash',
  'cash_on_delivery',
  'coupon',
  'elore_utalas',
  'ep_kartya',
  'kompenzacio',
  'levonas',
  'online_bankcard',
  'other',
  'paylike',
  'payoneer',
  'paypal',
  'paypal_utolag',
  'payu',
  'pick_pack_pont',
  'postai_csekk',
  'postautalvany',
  'skrill',
  'szep_card',
  'transferwise',
  'upwork',
  'utalvany',
  'valto',
  'wire_transfer',
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
  if (empty(request.buyer.taxNumber)) {
    errors.push({ code: 'MISSING_FIELD', field: 'taxNumber' });
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

  // --- Billingo-specific: block_id, language, payment_method (required) ---
  if (request.blockId === undefined || request.blockId === null || Number.isNaN(Number(request.blockId))) {
    errors.push({ code: 'MISSING_FIELD', field: 'blockId' });
  } else if (typeof request.blockId === 'number' && request.blockId < 1) {
    errors.push({ code: 'INVALID_VALUE', field: 'blockId', value: String(request.blockId) });
  }
  if (empty(request.language)) {
    errors.push({ code: 'MISSING_FIELD', field: 'language' });
  } else {
    const lang = request.language!.trim().toLowerCase();
    if (!(BILLINGO_LANGUAGES as readonly string[]).includes(lang)) {
      errors.push({ code: 'INVALID_VALUE', field: 'language', value: request.language! });
    }
  }
  const paymentMethodNorm = request.paymentMethod?.trim().toLowerCase() ?? '';
  if (empty(request.paymentMethod) || !ALLOWED_PAYMENT_METHODS.has(paymentMethodNorm)) {
    errors.push({
      code: request.paymentMethod ? 'INVALID_VALUE' : 'MISSING_FIELD',
      field: 'paymentMethod',
      value: request.paymentMethod || '',
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
      } else if (!BILLINGO_ALLOWED_VAT_PERCENTS.includes(item.vatPercent as (typeof BILLINGO_ALLOWED_VAT_PERCENTS)[number])) {
        errors.push({
          code: 'INVALID_VALUE',
          field: 'vatPercent',
          value: String(index + 1),
        });
      }
      const unitPriceType = item.unitPriceType ?? 'net';
      if (unitPriceType !== 'net' && unitPriceType !== 'gross') {
        errors.push({
          code: 'INVALID_VALUE',
          field: 'unitPriceType',
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
 * "A következő kötelező mező hiányzik:" appears once, followed by comma-separated field names.
 * Used for error_message in DB and for API/UI responses.
 */
export function buildBillingoValidationMessage(
  errors: BillingoValidationError[],
  locale: 'hu' | 'en'
): string {
  const m = getMessages(locale);
  const fieldLabels = new Set<string>();
  for (const e of errors) {
    if (e.field) {
      fieldLabels.add(m.fields[e.field] ?? e.field);
    }
  }
  const fieldsLine =
    fieldLabels.size > 0
      ? m.missingFields.replace('{fields}', [...fieldLabels].join(', '))
      : '';
  const parts = [m.blocked];
  if (fieldsLine) parts.push(fieldsLine);
  parts.push(m.fixAndRetry);
  return parts.join(' ');
}
