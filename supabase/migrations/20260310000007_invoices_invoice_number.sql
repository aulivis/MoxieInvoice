-- Human-readable invoice number from billing provider (e.g. "2024-0001" from Billingo,
-- or the szamlazz invoice number). Separate from external_id (Billingo numeric document ID).
-- For Számlázz.hu, external_id and invoice_number are the same value.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

COMMENT ON COLUMN invoices.invoice_number IS 'Human-readable invoice number from the billing provider (e.g. "2024-0001"). For Billingo this differs from external_id (which is the numeric document ID).';
