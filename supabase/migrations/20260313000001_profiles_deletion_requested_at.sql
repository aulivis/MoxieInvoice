-- Account deletion request: 14-day grace period before permanent deletion.
-- When set, the account is suspended; user can reactivate by logging in and clicking "Restore".
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN profiles.deletion_requested_at IS 'When set, account is pending deletion; after 14 days cron permanently deletes org + user.';
