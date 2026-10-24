BEGIN;

ALTER TABLE academic.class_sessions
  DROP CONSTRAINT IF EXISTS class_sessions_statut_check;
ALTER TABLE academic.class_sessions
  ADD CONSTRAINT class_sessions_statut_check
  CHECK (statut IN ('tenue', 'reportee', 'annulee', 'enseignant_absent', 'planifiee'));

CREATE TABLE IF NOT EXISTS academic.class_session_versions (
  id         BIGSERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES academic.class_sessions(id),
  snapshot   JSONB NOT NULL,
  cree_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION academic.archiver_version_seance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $fn$
BEGIN
  INSERT INTO academic.class_session_versions (session_id, snapshot)
  VALUES (OLD.id, to_jsonb(OLD));
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS class_sessions_version_trigger ON academic.class_sessions;
CREATE TRIGGER class_sessions_version_trigger
BEFORE UPDATE ON academic.class_sessions
FOR EACH ROW EXECUTE FUNCTION academic.archiver_version_seance();

CREATE TABLE IF NOT EXISTS academic.class_session_attachments (
  id           BIGSERIAL PRIMARY KEY,
  session_id   INT NOT NULL REFERENCES academic.class_sessions(id),
  uploaded_by  INT NOT NULL REFERENCES identity.users(id),
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/png', 'image/jpeg')),
  content      BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 10485760),
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES identity.users(id),
  event_key   TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lu_le       TIMESTAMPTZ,
  UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON system.notifications (user_id, cree_le DESC) WHERE lu_le IS NULL;

CREATE TABLE IF NOT EXISTS system.email_outbox (
  id            BIGSERIAL PRIMARY KEY,
  event_key     TEXT NOT NULL UNIQUE,
  recipient     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  attempts      SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts  SMALLINT NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  available_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT USAGE ON SCHEMA academic, system TO app_main;
GRANT SELECT, INSERT ON academic.class_session_versions TO app_main;
GRANT USAGE ON SEQUENCE academic.class_session_versions_id_seq TO app_main;
GRANT SELECT, INSERT ON academic.class_session_attachments TO app_main;
GRANT USAGE ON SEQUENCE academic.class_session_attachments_id_seq TO app_main;
GRANT SELECT, INSERT, UPDATE ON system.notifications TO app_main;
GRANT USAGE ON SEQUENCE system.notifications_id_seq TO app_main;
GRANT SELECT, INSERT, UPDATE ON system.email_outbox TO app_main;
GRANT USAGE ON SEQUENCE system.email_outbox_id_seq TO app_main;
GRANT SELECT ON identity.users, ref.enrollment, evaluation.campaigns TO app_main;
GRANT SELECT ON evaluation.participation_ledger TO app_main;

COMMIT;
