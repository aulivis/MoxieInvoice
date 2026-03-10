-- Stripe webhook idempotency: track processed event IDs to prevent duplicate processing
CREATE TABLE processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-cleanup index: purge events older than 30 days via pg_cron or manual cleanup
CREATE INDEX idx_processed_stripe_events_created_at ON processed_stripe_events(created_at);

-- RLS: only service role (admin client) should access this table
ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- Retry support for pending_invoice_jobs
ALTER TABLE pending_invoice_jobs
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
