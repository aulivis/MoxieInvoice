import { z } from 'zod';

/** Normalize Moxie base URL: accept full URL from Moxie (e.g. https://pod01.withmoxie.com/api/public) and store only the server base. */
function normalizeMoxieBaseUrl(s: string): string {
  let base = s.trim().replace(/\/$/, '');
  base = base.replace(/\/api\/public\/?$/i, '');
  return base;
}

export const moxieConnectionBodySchema = z.object({
  baseUrl: z.string().min(1, 'baseUrl is required').transform(normalizeMoxieBaseUrl),
  apiKey: z.string().optional(),
});

export type MoxieConnectionBody = z.infer<typeof moxieConnectionBodySchema>;
