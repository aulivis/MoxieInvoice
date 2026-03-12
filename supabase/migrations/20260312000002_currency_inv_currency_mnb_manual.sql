-- Currency: remove EUR→HUF checkbox, add manual rate columns, conversion_source = MNB vs manual.
-- When inv-currency differs from source, org chooses MNB daily or manual rates (EUR-HUF, USD-HUF).

-- Drop deprecated column
ALTER TABLE org_settings DROP COLUMN IF EXISTS currency_convert_to_huf;

-- Allow 'manual' (replacing 'fixed') in conversion_source
ALTER TABLE org_settings DROP CONSTRAINT IF EXISTS org_settings_conversion_source_check;
ALTER TABLE org_settings ADD CONSTRAINT org_settings_conversion_source_check
  CHECK (conversion_source IS NULL OR conversion_source IN ('mnb_daily', 'manual'));

-- Migrate existing 'fixed' to 'manual'
UPDATE org_settings SET conversion_source = 'manual' WHERE conversion_source = 'fixed';

-- Manual rate columns (HUF per 1 unit of foreign currency)
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS manual_eur_huf NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS manual_usd_huf NUMERIC(12, 4);

-- Backfill manual_eur_huf from deprecated fixed_eur_huf_rate
UPDATE org_settings SET manual_eur_huf = fixed_eur_huf_rate WHERE manual_eur_huf IS NULL AND fixed_eur_huf_rate IS NOT NULL;

COMMENT ON COLUMN org_settings.conversion_source IS 'When conversion is needed: mnb_daily = MNB rate, manual = use manual_eur_huf / manual_usd_huf';
COMMENT ON COLUMN org_settings.manual_eur_huf IS 'Manual rate: 1 EUR = N HUF (used when conversion_source = manual)';
COMMENT ON COLUMN org_settings.manual_usd_huf IS 'Manual rate: 1 USD = N HUF (used when conversion_source = manual)';
