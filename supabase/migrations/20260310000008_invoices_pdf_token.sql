-- One-time token for serving the invoice PDF via the app's proxy endpoint.
-- Moxie downloads the PDF from /api/invoices/{id}/pdf?token={pdf_token}.
-- Token is cleared (set to NULL) after successful Moxie attachment sync.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pdf_token UUID;

COMMENT ON COLUMN invoices.pdf_token IS 'One-time token for the PDF proxy endpoint (/api/invoices/{id}/pdf?token=...). Cleared after successful Moxie sync.';
