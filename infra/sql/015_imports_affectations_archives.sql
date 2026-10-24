CREATE TABLE IF NOT EXISTS academic.import_staging (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(30) NOT NULL CHECK (type IN (
    'etudiants', 'enseignants', 'ue', 'offres', 'affectations',
    'inscriptions', 'delegues'
  )),
  requested_by INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  campus_id    INT REFERENCES ref.campus(id),
  valid_rows   JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors       JSONB NOT NULL DEFAULT '[]'::jsonb,
  lignes_total INT NOT NULL DEFAULT 0 CHECK (lignes_total >= 0),
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_attente'
               CHECK (statut IN ('en_attente', 'termine')),
  resultat     JSONB,
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expire_le    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS import_staging_expiry_idx
  ON academic.import_staging (expire_le);

CREATE TABLE IF NOT EXISTS ref.class_delegate_mandates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          INT NOT NULL REFERENCES ref.program(id) ON DELETE CASCADE,
  annee_universitaire TEXT NOT NULL CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  student_id          INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  type_mandat         VARCHAR(20) NOT NULL CHECK (type_mandat IN ('titulaire', 'suppleant')),
  debut               DATE NOT NULL,
  fin                 DATE NOT NULL,
  cree_le             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fin >= debut),
  UNIQUE (program_id, annee_universitaire, type_mandat),
  UNIQUE (program_id, annee_universitaire, student_id)
);

CREATE INDEX IF NOT EXISTS class_delegate_mandates_student_idx
  ON ref.class_delegate_mandates (student_id, annee_universitaire);

CREATE TABLE IF NOT EXISTS academic.annual_archives (
  id                  BIGSERIAL PRIMARY KEY,
  annee_universitaire TEXT NOT NULL UNIQUE CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  snapshot            JSONB NOT NULL,
  archive_par         INT NOT NULL REFERENCES identity.users(id),
  archive_le          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS annual_archives_date_idx
  ON academic.annual_archives (archive_le DESC);

GRANT SELECT, INSERT, UPDATE ON academic.import_staging TO app_main;
GRANT SELECT, INSERT, UPDATE, DELETE ON ref.class_delegate_mandates TO app_main;
GRANT SELECT, INSERT ON academic.annual_archives TO app_main;
GRANT USAGE, SELECT ON SEQUENCE academic.annual_archives_id_seq TO app_main;
