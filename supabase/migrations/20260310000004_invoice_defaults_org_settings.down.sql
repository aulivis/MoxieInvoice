ALTER TABLE org_settings
  DROP COLUMN IF EXISTS default_invoice_block_id,
  DROP COLUMN IF EXISTS default_invoice_language,
  DROP COLUMN IF EXISTS default_payment_method;
