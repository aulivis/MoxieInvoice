/**
 * In-memory rate limiter for sensitive endpoints.
 * Per-instance only (Vercel serverless); for production at scale consider Vercel KV or Upstash Redis.
 */

const WINDOW_MS = 60 * 1000; // 1 minute

const store = new Map<
  string,
  { count: number; resetAt: number }
>();

function getWindowKey(identifier: string): string {
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  return `${identifier}:${windowStart}`;
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return ip;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

/**
 * Check rate limit. Returns { ok: true } or { ok: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  identifier: string,
  limitPerMinute: number
): RateLimitResult {
  const key = getWindowKey(identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > limitPerMinute) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true };
}

/** Clean old entries periodically to avoid unbounded memory growth. */
function prune() {
  const now = Date.now();
  Array.from(store.entries()).forEach(([k, v]) => {
    if (now >= v.resetAt) store.delete(k);
  });
}
const PRUNE_INTERVAL = 5 * 60 * 1000; // 5 min
if (typeof setInterval !== 'undefined') {
  setInterval(prune, PRUNE_INTERVAL);
}
