BEGIN;

CREATE TABLE IF NOT EXISTS identity.email_change_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  pending_email VARCHAR(255) NOT NULL,
  token_hash    TEXT NOT NULL,
  attempts      SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_change_requests_active_user_idx
  ON identity.email_change_requests (user_id) WHERE used_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_change_requests_active_email_idx
  ON identity.email_change_requests (LOWER(pending_email)) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS email_change_requests_expiry_idx
  ON identity.email_change_requests (expires_at) WHERE used_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON identity.email_change_requests TO app_main;

COMMIT;
