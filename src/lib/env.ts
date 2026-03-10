import { z } from 'zod';

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  // CRON_SECRET: required in production (validated at runtime in cron route)
  CRON_SECRET: z.string().min(1).optional(),
  // ENCRYPTION_KEY: 64-char hex (32 bytes). Required for encrypting credentials.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z.string().length(64).optional(),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: true,
});

export type Env = z.infer<typeof serverSchema>;

let cached: Env | null = null;

/**
 * Validate and return server env. Call from API routes / server code.
 * Caches result after first successful validation.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const result = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  });
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      `Env validation failed: ${first?.path.join('.') ?? 'unknown'} – ${first?.message ?? result.error.message}`
    );
  }
  cached = result.data;
  return result.data;
}

/**
 * Client-safe env (only NEXT_PUBLIC_*). Use in client components if needed.
 */
export function getClientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
