BEGIN;

CREATE SCHEMA IF NOT EXISTS academic;

ALTER TABLE ref.course
  ADD COLUMN IF NOT EXISTS heures_cm_prevues NUMERIC(6, 2) NOT NULL DEFAULT 0
    CHECK (heures_cm_prevues >= 0),
  ADD COLUMN IF NOT EXISTS heures_td_prevues NUMERIC(6, 2) NOT NULL DEFAULT 0
    CHECK (heures_td_prevues >= 0),
  ADD COLUMN IF NOT EXISTS heures_tp_prevues NUMERIC(6, 2) NOT NULL DEFAULT 0
    CHECK (heures_tp_prevues >= 0);

CREATE TABLE IF NOT EXISTS academic.class_sessions (
  id               SERIAL PRIMARY KEY,
  course_id        INT NOT NULL REFERENCES ref.course(id),
  created_by       INT NOT NULL REFERENCES identity.users(id),
  date             DATE NOT NULL,
  debut            TIME NOT NULL,
  fin              TIME NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('CM', 'TD', 'TP', 'AUTRE')),
  groupe           TEXT,
  statut           TEXT NOT NULL CHECK (statut IN ('tenue', 'reportee', 'annulee', 'enseignant_absent')),
  intitule         TEXT,
  contenu          TEXT,
  travail_a_faire  TEXT,
  effectif         INT CHECK (effectif IS NULL OR effectif >= 0),
  observations     TEXT,
  visa_statut      TEXT NOT NULL DEFAULT 'en_attente'
                   CHECK (visa_statut IN ('en_attente', 'vise', 'conteste')),
  visa_commentaire TEXT,
  visa_date        TIMESTAMPTZ,
  visa_par         INT REFERENCES identity.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT class_sessions_valid_hours CHECK (fin > debut),
  CONSTRAINT class_sessions_visa_consistency CHECK (
    (visa_statut = 'en_attente' AND visa_date IS NULL AND visa_par IS NULL)
    OR (visa_statut <> 'en_attente' AND visa_date IS NOT NULL AND visa_par IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS class_sessions_course_date_idx
  ON academic.class_sessions (course_id, date DESC, debut DESC);

GRANT USAGE ON SCHEMA academic TO app_main;
GRANT SELECT, INSERT ON academic.class_sessions TO app_main;
GRANT UPDATE (
  course_id, date, debut, fin, type, groupe, statut, intitule, contenu,
  travail_a_faire, effectif, observations, visa_statut, visa_commentaire,
  visa_date, visa_par, updated_at
) ON academic.class_sessions TO app_main;
GRANT USAGE ON SEQUENCE academic.class_sessions_id_seq TO app_main;
GRANT SELECT ON ref.course TO app_main;

COMMIT;
