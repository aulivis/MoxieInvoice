-- Revert currency changes: restore currency_convert_to_huf, drop manual columns, restore conversion_source check.

ALTER TABLE org_settings DROP COLUMN IF EXISTS manual_eur_huf;
ALTER TABLE org_settings DROP COLUMN IF EXISTS manual_usd_huf;

ALTER TABLE org_settings DROP CONSTRAINT IF EXISTS org_settings_conversion_source_check;
ALTER TABLE org_settings ADD CONSTRAINT org_settings_conversion_source_check
  CHECK (conversion_source IS NULL OR conversion_source IN ('fixed', 'mnb_daily'));

UPDATE org_settings SET conversion_source = 'fixed' WHERE conversion_source = 'manual';

ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS currency_convert_to_huf BOOLEAN NOT NULL DEFAULT false;
