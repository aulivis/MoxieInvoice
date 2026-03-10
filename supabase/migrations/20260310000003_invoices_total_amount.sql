-- Add total_amount to invoices for display in list (gross total from items)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);

COMMENT ON COLUMN invoices.total_amount IS 'Gross total (with VAT) computed from payload_snapshot items for list display.';
