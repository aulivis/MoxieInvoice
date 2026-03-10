/**
 * Normalized invoice request used by both Billingo and Számlázz.hu adapters.
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
  }>;
  currency: string;
  fulfillmentDate: string; // YYYY-MM-DD
  dueDate?: string;
  paymentMethod?: string;
  comment?: string;
  invoiceType?: string; // e.g. 'invoice', 'proforma', 'advance'
}

export interface InvoiceResult {
  externalId: string;
  invoiceNumber: string;
  pdfUrl?: string;
}
