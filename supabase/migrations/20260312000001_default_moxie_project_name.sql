-- Default Moxie project name for Create Task when invoice creation fails (e.g. validation error).
-- Used when the webhook payload does not include a project name; task is only created if clientName + projectName are available.
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS default_moxie_project_name TEXT;

COMMENT ON COLUMN org_settings.default_moxie_project_name IS 'Default Moxie project name for creating a task when invoice creation fails; must match a project owned by the client.';
