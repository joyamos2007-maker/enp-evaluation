BEGIN;

CREATE SCHEMA IF NOT EXISTS academic;

CREATE TABLE IF NOT EXISTS academic.assessment_columns (
  id          SERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES ref.course(id) ON DELETE CASCADE,
  created_by  INT NOT NULL REFERENCES identity.users(id),
  libelle     TEXT NOT NULL CHECK (length(btrim(libelle)) BETWEEN 1 AND 120),
  type        TEXT NOT NULL CHECK (type IN ('devoir', 'examen')),
  bareme      NUMERIC(8, 2) NOT NULL CHECK (bareme > 0 AND bareme <= 100000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, course_id)
);

CREATE INDEX IF NOT EXISTS assessment_columns_course_idx
  ON academic.assessment_columns (course_id, created_at, id);

CREATE TABLE IF NOT EXISTS academic.assessment_scores (
  assessment_id INT NOT NULL,
  course_id     INT NOT NULL,
  student_id    INT NOT NULL,
  note          NUMERIC(8, 2) CHECK (note IS NULL OR note >= 0),
  updated_by    INT NOT NULL REFERENCES identity.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, student_id),
  FOREIGN KEY (assessment_id, course_id)
    REFERENCES academic.assessment_columns(id, course_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id, student_id)
    REFERENCES ref.enrollment(course_id, student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS assessment_scores_student_idx
  ON academic.assessment_scores (student_id, course_id);

CREATE OR REPLACE FUNCTION academic.verifier_note_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  maximum NUMERIC(8, 2);
BEGIN
  SELECT bareme INTO maximum
  FROM academic.assessment_columns
  WHERE id = NEW.assessment_id AND course_id = NEW.course_id;

  IF NEW.note IS NOT NULL AND NEW.note > maximum THEN
    RAISE EXCEPTION 'La note dépasse le barème de l’évaluation'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessment_scores_note_bareme ON academic.assessment_scores;
CREATE TRIGGER assessment_scores_note_bareme
  BEFORE INSERT OR UPDATE
  ON academic.assessment_scores
  FOR EACH ROW EXECUTE FUNCTION academic.verifier_note_evaluation();

CREATE TABLE IF NOT EXISTS academic.attendance_sessions (
  id          SERIAL PRIMARY KEY,
  course_id   INT NOT NULL REFERENCES ref.course(id) ON DELETE CASCADE,
  created_by  INT NOT NULL REFERENCES identity.users(id),
  date        DATE NOT NULL,
  libelle     TEXT NOT NULL CHECK (length(btrim(libelle)) BETWEEN 1 AND 120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, course_id)
);

CREATE INDEX IF NOT EXISTS attendance_sessions_course_date_idx
  ON academic.attendance_sessions (course_id, date DESC, id DESC);

CREATE TABLE IF NOT EXISTS academic.attendance_records (
  session_id  INT NOT NULL REFERENCES academic.attendance_sessions(id) ON DELETE CASCADE,
  course_id   INT NOT NULL,
  student_id  INT NOT NULL,
  statut      TEXT NOT NULL CHECK (statut IN ('present', 'absent', 'retard')),
  updated_by  INT NOT NULL REFERENCES identity.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, student_id),
  FOREIGN KEY (course_id, student_id)
    REFERENCES ref.enrollment(course_id, student_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id, course_id)
    REFERENCES academic.attendance_sessions(id, course_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS attendance_records_student_idx
  ON academic.attendance_records (student_id, course_id);

GRANT USAGE ON SCHEMA academic TO app_main;
GRANT SELECT, INSERT ON academic.assessment_columns TO app_main;
GRANT USAGE, SELECT ON SEQUENCE academic.assessment_columns_id_seq TO app_main;
GRANT SELECT, INSERT, UPDATE, DELETE ON academic.assessment_scores TO app_main;
GRANT SELECT, INSERT ON academic.attendance_sessions TO app_main;
GRANT USAGE, SELECT ON SEQUENCE academic.attendance_sessions_id_seq TO app_main;
GRANT SELECT, INSERT, UPDATE, DELETE ON academic.attendance_records TO app_main;

COMMIT;
