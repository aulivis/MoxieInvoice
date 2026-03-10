/**
 * Centralized error logging.
 * Logs to console. To enable Sentry: install @sentry/nextjs,
 * set SENTRY_DSN env var, and uncomment the Sentry lines below.
 */

// import * as Sentry from '@sentry/nextjs';

export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const ctx = context ? ` | ${JSON.stringify(context)}` : '';
  console.error(`[ERROR] ${err.message}${ctx}`, err.stack ?? '');

  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(err, { extra: context });
  // }
}

export function logWarn(message: string, context?: Record<string, unknown>): void {
  const ctx = context ? ` | ${JSON.stringify(context)}` : '';
  console.warn(`[WARN] ${message}${ctx}`);
}
