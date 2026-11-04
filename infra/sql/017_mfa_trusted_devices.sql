BEGIN;

CREATE TABLE IF NOT EXISTS identity.mfa_trusted_devices (
  user_id       INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash    TEXT PRIMARY KEY,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_trusted_devices_user_expiry_idx
  ON identity.mfa_trusted_devices (user_id, expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON identity.mfa_trusted_devices TO app_main;

COMMIT;
