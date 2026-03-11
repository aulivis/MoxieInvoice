-- Add moxie_invoice_uuid to store the raw Moxie invoice UUID from the webhook body.id field.
-- This is used to construct direct links to the invoice page in the Moxie web app:
-- {webBaseUrl}/accounting/invoices#{moxie_invoice_uuid}
-- Unlike moxie_invoice_id (which stores the formatted invoice number), this is the internal UUID.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS moxie_invoice_uuid TEXT;

COMMENT ON COLUMN invoices.moxie_invoice_uuid IS
  'Raw Moxie UUID from webhook body.id. Used to construct direct Moxie invoice page URLs.';
