-- Default Billingo invoice fields: block_id, language, payment_method.
-- When a Moxie invoice or manual request does not override these, org defaults are used.
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS default_invoice_block_id INTEGER,
  ADD COLUMN IF NOT EXISTS default_invoice_language TEXT CHECK (default_invoice_language IN ('hu', 'en')),
  ADD COLUMN IF NOT EXISTS default_payment_method TEXT;

COMMENT ON COLUMN org_settings.default_invoice_block_id IS 'Default Billingo block id (számlatömb) when issuing invoices.';
COMMENT ON COLUMN org_settings.default_invoice_language IS 'Default document language (hu/en) for Billingo.';
COMMENT ON COLUMN org_settings.default_payment_method IS 'Default payment method for Billingo (e.g. bank_transfer).';
