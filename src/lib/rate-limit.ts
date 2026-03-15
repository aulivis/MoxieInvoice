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

/** Default limit for auth and data-modifying API routes (per client, per minute). */
export const API_RATE_LIMIT_PER_MINUTE = 60;

/**
 * If the request is over the rate limit, returns a 429 Response with Retry-After.
 * Otherwise returns null (caller should proceed).
 */
export function rateLimitResponse(
  request: Request,
  identifierPrefix: string,
  limitPerMinute: number = API_RATE_LIMIT_PER_MINUTE
): Response | null {
  const id = getClientIdentifier(request);
  const result = checkRateLimit(`${identifierPrefix}:${id}`, limitPerMinute);
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: result.retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
        },
      }
    );
  }
  return null;
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
