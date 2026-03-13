-- Optional manual rate: 1 USD = N EUR (used when conversion_source = manual).
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS manual_usd_eur NUMERIC(12, 6);

COMMENT ON COLUMN org_settings.manual_usd_eur IS 'Optional manual rate: 1 USD = N EUR (when set, used for USD<->EUR instead of deriving from EUR-HUF and USD-HUF)';
