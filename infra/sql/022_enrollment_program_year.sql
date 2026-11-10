BEGIN;

CREATE OR REPLACE FUNCTION ref.propagate_enrollment_to_program_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_program_id INT;
  v_annee_universitaire TEXT;
BEGIN
  SELECT program_id, annee_universitaire
    INTO v_program_id, v_annee_universitaire
  FROM ref.course
  WHERE id = NEW.course_id;

  INSERT INTO ref.enrollment (course_id, student_id)
  SELECT c.id, NEW.student_id
  FROM ref.course c
  WHERE c.program_id = v_program_id
    AND c.annee_universitaire = v_annee_universitaire
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ref.propagate_course_to_program_enrollments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO ref.enrollment (course_id, student_id)
  SELECT NEW.id, e.student_id
  FROM ref.course sibling
  JOIN ref.enrollment e ON e.course_id = sibling.id
  WHERE sibling.program_id = NEW.program_id
    AND sibling.annee_universitaire = NEW.annee_universitaire
    AND sibling.id <> NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollment_program_year_sync ON ref.enrollment;
CREATE TRIGGER enrollment_program_year_sync
AFTER INSERT ON ref.enrollment
FOR EACH ROW EXECUTE FUNCTION ref.propagate_enrollment_to_program_year();

DROP TRIGGER IF EXISTS course_program_year_enrollments_sync ON ref.course;
CREATE TRIGGER course_program_year_enrollments_sync
AFTER INSERT ON ref.course
FOR EACH ROW EXECUTE FUNCTION ref.propagate_course_to_program_enrollments();

INSERT INTO ref.enrollment (course_id, student_id)
SELECT DISTINCT target.id, enrolled.student_id
FROM ref.course source
JOIN ref.enrollment enrolled ON enrolled.course_id = source.id
JOIN ref.course target
  ON target.program_id = source.program_id
 AND target.annee_universitaire = source.annee_universitaire
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON ref.enrollment TO app_main;

COMMIT;
