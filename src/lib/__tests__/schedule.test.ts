import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock Supabase so we can control what the DB returns ---
const mockMaybeSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

// Set env vars so schedule.ts creates the Supabase client
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'service-role-test';

const { isInvoicingAllowed } = await import('../schedule');

// Helper dates (all in January, UTC+1 = Europe/Budapest winter time)
// Monday 2024-01-15 10:00 Budapest = 09:00 UTC
const MON_10AM = new Date('2024-01-15T09:00:00Z');
// Monday 2024-01-15 20:00 Budapest = 19:00 UTC
const MON_20PM = new Date('2024-01-15T19:00:00Z');
// Saturday 2024-01-13 10:00 Budapest = 09:00 UTC
const SAT_10AM = new Date('2024-01-13T09:00:00Z');

function mockSchedule(data: Record<string, unknown> | null) {
  mockMaybeSingle.mockResolvedValue({ data, error: null });
}

describe('isInvoicingAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('schedule: always', () => {
    it('allows on weekday business hours', async () => {
      mockSchedule({ schedule_type: 'always', timezone: 'Europe/Budapest', start_time: null, end_time: null });
      expect(await isInvoicingAllowed('org-1', MON_10AM)).toBe(true);
    });

    it('allows on weekend', async () => {
      mockSchedule({ schedule_type: 'always', timezone: 'Europe/Budapest', start_time: null, end_time: null });
      expect(await isInvoicingAllowed('org-1', SAT_10AM)).toBe(true);
    });

    it('allows at night', async () => {
      mockSchedule({ schedule_type: 'always', timezone: 'Europe/Budapest', start_time: null, end_time: null });
      expect(await isInvoicingAllowed('org-1', MON_20PM)).toBe(true);
    });
  });

  describe('schedule: weekdays_only', () => {
    it('allows on Monday', async () => {
      mockSchedule({ schedule_type: 'weekdays_only', timezone: 'Europe/Budapest', start_time: null, end_time: null });
      expect(await isInvoicingAllowed('org-1', MON_10AM)).toBe(true);
    });

    it('blocks on Saturday', async () => {
      mockSchedule({ schedule_type: 'weekdays_only', timezone: 'Europe/Budapest', start_time: null, end_time: null });
      expect(await isInvoicingAllowed('org-1', SAT_10AM)).toBe(false);
    });
  });

  describe('schedule: business_hours_only', () => {
    it('allows Monday 10:00 within default 08:00-17:00', async () => {
      mockSchedule({ schedule_type: 'business_hours_only', timezone: 'Europe/Budapest', start_time: '08:00', end_time: '17:00' });
      expect(await isInvoicingAllowed('org-1', MON_10AM)).toBe(true);
    });

    it('blocks Monday 20:00 outside default 08:00-17:00', async () => {
      mockSchedule({ schedule_type: 'business_hours_only', timezone: 'Europe/Budapest', start_time: '08:00', end_time: '17:00' });
      expect(await isInvoicingAllowed('org-1', MON_20PM)).toBe(false);
    });

    it('blocks Saturday even during business hours', async () => {
      mockSchedule({ schedule_type: 'business_hours_only', timezone: 'Europe/Budapest', start_time: '08:00', end_time: '17:00' });
      expect(await isInvoicingAllowed('org-1', SAT_10AM)).toBe(false);
    });

    it('blocks when time equals start boundary (inclusive start)', async () => {
      // 08:00 Budapest = 07:00 UTC in winter
      const at0800 = new Date('2024-01-15T07:00:00Z');
      mockSchedule({ schedule_type: 'business_hours_only', timezone: 'Europe/Budapest', start_time: '08:00', end_time: '17:00' });
      expect(await isInvoicingAllowed('org-1', at0800)).toBe(true);
    });
  });

  describe('no org settings (null data)', () => {
    it('defaults to always-allowed when no settings row exists', async () => {
      mockSchedule(null);
      expect(await isInvoicingAllowed('org-1', SAT_10AM)).toBe(true);
    });
  });
});
