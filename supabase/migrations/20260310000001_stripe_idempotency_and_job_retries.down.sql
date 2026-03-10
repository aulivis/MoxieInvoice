-- Rollback: stripe idempotency and job retry columns
ALTER TABLE pending_invoice_jobs
  DROP COLUMN IF EXISTS next_retry_at,
  DROP COLUMN IF EXISTS retry_count;

DROP INDEX IF EXISTS idx_processed_stripe_events_created_at;
DROP TABLE IF EXISTS processed_stripe_events;
