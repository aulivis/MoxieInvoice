import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIdentifier } from '../rate-limit';

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    const result = checkRateLimit('test-allow-first', 10);
    expect(result.ok).toBe(true);
  });

  it('allows requests up to the limit', () => {
    const id = 'test-up-to-limit';
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(id, 5).ok).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const id = 'test-exceed-limit';
    for (let i = 0; i < 5; i++) checkRateLimit(id, 5);
    const result = checkRateLimit(id, 5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it('resets after the time window', () => {
    vi.useFakeTimers();
    const id = 'test-window-reset';
    for (let i = 0; i < 3; i++) checkRateLimit(id, 3);

    // advance 61 seconds into the next window
    vi.advanceTimersByTime(61_000);

    const result = checkRateLimit(id, 3);
    expect(result.ok).toBe(true);
  });

  it('different identifiers have independent counters', () => {
    const a = 'test-id-a-independent';
    const b = 'test-id-b-independent';
    for (let i = 0; i < 5; i++) checkRateLimit(a, 5);
    checkRateLimit(a, 5); // 6th → blocked

    // b is unaffected
    expect(checkRateLimit(b, 5).ok).toBe(true);
  });
});

describe('getClientIdentifier', () => {
  it('uses x-forwarded-for header when present', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.10.11.12' },
    });
    expect(getClientIdentifier(req)).toBe('9.10.11.12');
  });

  it('returns "unknown" when no IP headers present', () => {
    const req = new Request('http://localhost');
    expect(getClientIdentifier(req)).toBe('unknown');
  });
});
