import { z } from 'zod';

export const syncPaymentBodySchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentType: z.string().optional(),
});

export type SyncPaymentBody = z.infer<typeof syncPaymentBodySchema>;
