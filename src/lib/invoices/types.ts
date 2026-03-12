/** Billingo accepts these unit_price_type values. */
export type UnitPriceType = 'net' | 'gross';

/** Billingo accepts these VAT percentages (item.vat). */
export const BILLINGO_ALLOWED_VAT_PERCENTS = [0, 5, 18, 27] as const;

/**
 * Normalized invoice request used by both Billingo and Számlázz.hu adapters.
 * blockId, language, paymentMethod are required for Billingo (or use org defaults).
 */
export interface NormalizedInvoiceRequest {
  buyer: {
    name: string;
    taxNumber?: string;
    postCode: string;
    city: string;
    address: string;
    countryCode?: string;
    email?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    netUnitPrice: number;
    vatPercent: number;
    /** Billingo: required when product_id is not present. Default 'net'. */
    unitPriceType?: UnitPriceType;
  }>;
  currency: string;
  /** When set and different from currency, amounts must be converted to this before issuing. */
  targetCurrency?: string;
  fulfillmentDate: string; // YYYY-MM-DD
  dueDate?: string;
  paymentMethod?: string;
  comment?: string;
  /** Normalized from Moxie rm-inv-type: 'proforma' | 'invoice' | 'advance'; default 'invoice'. */
  invoiceType?: string;
  /** Billingo: invoice block id (required). */
  blockId?: number;
  /** Billingo: document language e.g. 'hu', 'en' (required). */
  language?: string;
}

export interface InvoiceResult {
  externalId: string;
  invoiceNumber: string;
  pdfUrl?: string;
}
