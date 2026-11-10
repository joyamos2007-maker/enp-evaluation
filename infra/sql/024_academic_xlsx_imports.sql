BEGIN;

ALTER TABLE academic.import_staging
  DROP CONSTRAINT IF EXISTS import_staging_type_check;

ALTER TABLE academic.import_staging
  ADD CONSTRAINT import_staging_type_check
  CHECK (type IN (
    'etudiants', 'enseignants', 'ue', 'offres', 'affectations',
    'inscriptions', 'delegues', 'catalogue', 'presences'
  ));

ALTER TABLE ref.ue
  ADD COLUMN IF NOT EXISTS prerequis TEXT,
  ADD COLUMN IF NOT EXISTS option TEXT;

ALTER TABLE ref.course
  ADD COLUMN IF NOT EXISTS annee_etude SMALLINT
  CHECK (annee_etude IS NULL OR annee_etude BETWEEN 1 AND 10);

CREATE TABLE IF NOT EXISTS ref.course_contacts (
  id          BIGSERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES ref.course(id) ON DELETE CASCADE,
  teacher_id  INT REFERENCES identity.users(id),
  enseignant  TEXT,
  telephone   TEXT,
  email       TEXT
);

CREATE INDEX IF NOT EXISTS course_contacts_course_idx
  ON ref.course_contacts (course_id);

GRANT SELECT, INSERT, UPDATE ON ref.campus, ref.department, ref.program,
  ref.ue, ref.course, ref.course_teacher, ref.course_contacts TO app_main;
GRANT USAGE, SELECT ON SEQUENCE ref.campus_id_seq, ref.department_id_seq,
  ref.program_id_seq, ref.ue_id_seq, ref.course_id_seq,
  ref.course_contacts_id_seq TO app_main;
GRANT SELECT, INSERT, UPDATE ON academic.import_staging TO app_main;

COMMIT;
