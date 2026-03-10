import { z } from 'zod';

export const fieldMappingBodySchema = z.object({
  moxie_custom_field_key: z.string().min(1, 'moxie_custom_field_key is required'),
  provider: z.enum(['billingo', 'szamlazz']),
  provider_field: z.string().min(1, 'provider_field is required'),
  value_mapping: z.record(z.string(), z.string()).optional().default({}),
});

export type FieldMappingBody = z.infer<typeof fieldMappingBodySchema>;
