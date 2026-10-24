ALTER TABLE identity.refresh_tokens
  ADD COLUMN IF NOT EXISTS active_role VARCHAR(30);

CREATE TABLE IF NOT EXISTS identity.account_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  type       VARCHAR(30) NOT NULL CHECK (type IN ('activation', 'password_reset')),
  token_hash TEXT NOT NULL,
  attempts   SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_tokens_active_user_type_idx
  ON identity.account_tokens (user_id, type) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS account_tokens_expiry_idx
  ON identity.account_tokens (expires_at) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS identity.user_mfa (
  user_id             INT PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  totp_secret         TEXT,
  pending_totp_secret TEXT,
  totp_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (totp_enabled = FALSE OR totp_secret IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS identity.mfa_challenges (
  id              UUID PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  email_code_hash TEXT NOT NULL,
  attempts        SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mfa_challenges_expiry_idx
  ON identity.mfa_challenges (expires_at) WHERE used_at IS NULL;
