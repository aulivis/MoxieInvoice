-- account_link_requests: one-time tokens for "link Google-only account to existing Magic Link account" flow.
-- Used by POST /api/auth/link-existing-account and GET /auth/link-existing. Service role / backend only.

CREATE TABLE account_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  google_user_id UUID NOT NULL,
  target_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_link_requests_token_hash ON account_link_requests(token_hash);
CREATE INDEX idx_account_link_requests_expires_at ON account_link_requests(expires_at);

-- RLS: no direct client access; backend uses service role.
ALTER TABLE account_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON account_link_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);
