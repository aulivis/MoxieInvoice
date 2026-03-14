-- MNB (Magyar Nemzeti Bank) daily exchange rate cache.
-- Filled by cron at 12:00 and 0:00 Budapest on weekdays; 30-day retention.
CREATE TABLE mnb_exchange_rates (
  rate_date DATE NOT NULL,
  currency TEXT NOT NULL,
  rate NUMERIC(12, 4) NOT NULL,
  PRIMARY KEY (rate_date, currency),
  CHECK (currency IN ('EUR', 'USD'))
);

CREATE INDEX idx_mnb_exchange_rates_rate_date ON mnb_exchange_rates(rate_date);

COMMENT ON TABLE mnb_exchange_rates IS 'Cached MNB daily mid rates (1 unit = rate HUF). Refreshed weekdays 12:00 and 0:00 Budapest; data older than 30 days is purged.';

ALTER TABLE mnb_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (UI and server read cached rates).
CREATE POLICY mnb_rates_select ON mnb_exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE for app roles; cron uses service role and bypasses RLS.
