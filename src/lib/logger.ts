/**
 * Centralized structured logging for observability and IR.
 * Outputs one JSON object per log line (traceId, userId, message, context) for SIEM/log aggregation.
 * To enable Sentry: install @sentry/nextjs, set SENTRY_DSN env var, and uncomment the Sentry lines below.
 */

// import * as Sentry from '@sentry/nextjs';

export type LogContext = Record<string, unknown> & {
  traceId?: string;
  userId?: string;
};

function structuredPayload(
  level: 'error' | 'warn',
  message: string,
  context?: LogContext,
  stack?: string
): string {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && typeof context === 'object' ? context : {}),
  };
  if (stack) payload.stack = stack;
  return JSON.stringify(payload);
}

export function logError(
  error: unknown,
  context?: LogContext
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const out = structuredPayload('error', err.message, context, err.stack);
  console.error(out);

  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(err, { extra: context });
  // }
}

export function logWarn(message: string, context?: LogContext): void {
  const out = structuredPayload('warn', message, context);
  console.warn(out);
}
