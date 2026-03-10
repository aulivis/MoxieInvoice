import { z } from 'zod';

export const billingProviderBodySchema = z.object({
  provider: z.enum(['billingo', 'szamlazz']),
  apiKey: z.string().optional(),
  agentKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  sellerName: z.string().optional(),
  sellerTaxNumber: z.string().optional(),
  sellerBankAccount: z.string().optional(),
});

export type BillingProviderBody = z.infer<typeof billingProviderBodySchema>;
