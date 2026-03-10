-- Rollback: remove last_tested_at from moxie_connections
ALTER TABLE moxie_connections DROP COLUMN IF EXISTS last_tested_at;
