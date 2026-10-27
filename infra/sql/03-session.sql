CREATE TABLE IF NOT EXISTS identity.refresh_tokens (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INT         NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  famille_id    UUID        NOT NULL,
  jeton_hash    TEXT        NOT NULL UNIQUE,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inactif_apres TIMESTAMPTZ NOT NULL,   -- fin si non renouvele
  expire_le     TIMESTAMPTZ NOT NULL,   -- fin absolue de la session
  remplace_le   TIMESTAMPTZ,            -- jeton deja utilise (rotation)
  revoque_le    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS refresh_tokens_famille_idx
  ON identity.refresh_tokens (famille_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx
  ON identity.refresh_tokens (user_id);