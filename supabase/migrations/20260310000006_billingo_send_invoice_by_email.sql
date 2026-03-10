-- Billingo: option to automatically send invoice by email after creation.
-- Only used when provider is Billingo; email is sent only if buyer has email set.
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS billingo_send_invoice_by_email BOOLEAN DEFAULT false;

COMMENT ON COLUMN org_settings.billingo_send_invoice_by_email IS 'When true and provider is Billingo, after creating a document we call Billingo send endpoint to email the invoice to the buyer (only if buyer has email).';
