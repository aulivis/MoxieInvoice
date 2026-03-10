-- Add last_tested_at to moxie_connections for connection status badge
ALTER TABLE moxie_connections
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

COMMENT ON COLUMN moxie_connections.last_tested_at IS 'When the Moxie connection was last successfully tested (used for "Live" badge).';
