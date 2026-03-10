import { z } from 'zod';

export const scheduleTypeEnum = z.enum([
  'always',
  'weekdays_only',
  'business_hours_only',
  'all_days_hours',
]);

export const currencySettingsSchema = z.object({
  currency_convert_to_huf: z.boolean().optional(),
  conversion_source: z.enum(['fixed', 'mnb_daily']).optional(),
  fixed_eur_huf_rate: z.coerce.number().positive().optional().nullable(),
});

export const scheduleSettingsSchema = z.object({
  schedule_type: scheduleTypeEnum.optional(),
  timezone: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

/** Billingo default fields: applied when request does not override (block, language, payment_method). */
export const invoiceDefaultsSchema = z.object({
  default_invoice_block_id: z.coerce.number().int().positive().optional().nullable(),
  default_invoice_language: z.string().optional().nullable(),
  default_payment_method: z.string().optional().nullable(),
});

// Merged schema (used by the legacy saveOrgSettingsAction and API POST)
export const orgSettingsBodySchema = currencySettingsSchema
  .merge(scheduleSettingsSchema)
  .merge(invoiceDefaultsSchema);

export type OrgSettingsBody = z.infer<typeof orgSettingsBodySchema>;
export type CurrencySettings = z.infer<typeof currencySettingsSchema>;
export type ScheduleSettings = z.infer<typeof scheduleSettingsSchema>;
export type ScheduleType = z.infer<typeof scheduleTypeEnum>;
