-- Add 'all_days_hours' to schedule_type CHECK constraint
-- This supports "all days (incl. weekends) + time window" combination

ALTER TABLE org_settings DROP CONSTRAINT IF EXISTS org_settings_schedule_type_check;

ALTER TABLE org_settings
  ADD CONSTRAINT org_settings_schedule_type_check
  CHECK (schedule_type IN ('always', 'weekdays_only', 'business_hours_only', 'all_days_hours'));
