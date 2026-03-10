import { z } from 'zod';

const buyerSchema = z.object({
  name: z.string().min(1, 'Buyer name is required'),
  taxNumber: z.string().optional(),
  postCode: z.string().min(1, 'Post code is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  countryCode: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

const invoiceItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1),
  netUnitPrice: z.coerce.number().min(0),
  vatPercent: z.coerce.number().min(0).max(100),
});

export const normalizedInvoiceRequestSchema = z.object({
  buyer: buyerSchema,
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  currency: z.string().min(1),
  fulfillmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.string().optional(),
  comment: z.string().optional(),
  invoiceType: z.string().optional(),
});

export const createInvoiceBodySchema = z.object({
  request: normalizedInvoiceRequestSchema,
  /** Locale for validation error messages (e.g. 'hu', 'en'). */
  locale: z.enum(['hu', 'en']).optional(),
});

export type CreateInvoiceBody = z.infer<typeof createInvoiceBodySchema>;
