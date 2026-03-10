-- Payment status for invoices: open (nyitott) / paid (fizetve).
-- Updated when Billingo (or other provider) sends paid signal via webhook.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'open'
    CHECK (payment_status IN ('open', 'paid'));

COMMENT ON COLUMN invoices.payment_status IS 'Payment status: open (nyitott) or paid (fizetve). Updated from Billingo webhook when document is paid.';
