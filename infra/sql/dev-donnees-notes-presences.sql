-- Donnees fictives de notes et de presence : developpement uniquement.
-- Pre-requis : migrations 010 et 012, puis dev-donnees-test.sql.
-- Relancable sans doublons; les saisies deja modifiees sont conservees.

BEGIN;

DO $$
BEGIN
  IF to_regclass('academic.assessment_columns') IS NULL
     OR to_regclass('academic.attendance_sessions') IS NULL THEN
    RAISE EXCEPTION 'Appliquer infra/sql/012_notes_presences.sql avant ce jeu de donnees';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM ref.course_teacher ct
    JOIN identity.users t ON t.id = ct.teacher_id
    WHERE t.matricule IN ('TEST-1001', 'TEST-1002')
  ) OR NOT EXISTS (
    SELECT 1 FROM ref.enrollment e
    JOIN identity.users s ON s.id = e.student_id
    WHERE s.matricule = 'TEST-0001'
  ) THEN
    RAISE EXCEPTION 'Appliquer infra/sql/dev-donnees-test.sql avant ce jeu de donnees';
  END IF;
END $$;

WITH demo(course_code, teacher_matricule, libelle, type, bareme) AS (
  VALUES
    ('INF501', 'TEST-1001', 'TEST - Devoir 1', 'devoir', 20::numeric),
    ('INF501', 'TEST-1001', 'TEST - Examen mi-semestre', 'examen', 40::numeric),
    ('INF502', 'TEST-1002', 'TEST - Devoir 1', 'devoir', 20::numeric)
)
INSERT INTO academic.assessment_columns (course_id, created_by, libelle, type, bareme)
SELECT co.id, teacher.id, demo.libelle, demo.type, demo.bareme
FROM demo
JOIN ref.ue ue ON ue.code = demo.course_code
JOIN ref.course co
  ON co.ue_id = ue.id
 AND co.annee_universitaire = '2026-2027'
 AND co.semestre = 5
JOIN identity.users teacher ON teacher.matricule = demo.teacher_matricule
JOIN ref.course_teacher ct
  ON ct.course_id = co.id AND ct.teacher_id = teacher.id
WHERE NOT EXISTS (
  SELECT 1 FROM academic.assessment_columns existing
  WHERE existing.course_id = co.id
    AND existing.libelle = demo.libelle
    AND existing.type = demo.type
);

WITH demo(course_code, libelle, type, student_matricule, note) AS (
  VALUES
    ('INF501', 'TEST - Devoir 1', 'devoir', 'TEST-0001', 17::numeric),
    ('INF501', 'TEST - Devoir 1', 'devoir', 'TEST-0002', 15::numeric),
    ('INF501', 'TEST - Devoir 1', 'devoir', 'TEST-0003', 12::numeric),
    ('INF501', 'TEST - Devoir 1', 'devoir', 'TEST-0004', 14::numeric),
    ('INF501', 'TEST - Devoir 1', 'devoir', 'TEST-0005', 16::numeric),
    ('INF501', 'TEST - Examen mi-semestre', 'examen', 'TEST-0001', 32::numeric),
    ('INF501', 'TEST - Examen mi-semestre', 'examen', 'TEST-0002', 28::numeric),
    ('INF501', 'TEST - Examen mi-semestre', 'examen', 'TEST-0003', 25::numeric),
    ('INF501', 'TEST - Examen mi-semestre', 'examen', 'TEST-0004', 30::numeric),
    ('INF501', 'TEST - Examen mi-semestre', 'examen', 'TEST-0005', 35::numeric),
    ('INF502', 'TEST - Devoir 1', 'devoir', 'TEST-0001', 18::numeric),
    ('INF502', 'TEST - Devoir 1', 'devoir', 'TEST-0002', 16::numeric),
    ('INF502', 'TEST - Devoir 1', 'devoir', 'TEST-0003', 13::numeric)
)
INSERT INTO academic.assessment_scores
  (assessment_id, course_id, student_id, note, updated_by)
SELECT a.id, co.id, student.id, demo.note, teacher.id
FROM demo
JOIN ref.ue ue ON ue.code = demo.course_code
JOIN ref.course co
  ON co.ue_id = ue.id
 AND co.annee_universitaire = '2026-2027'
 AND co.semestre = 5
JOIN academic.assessment_columns a
  ON a.course_id = co.id AND a.libelle = demo.libelle AND a.type = demo.type
JOIN ref.enrollment enrollment
  ON enrollment.course_id = co.id
JOIN identity.users student
  ON student.id = enrollment.student_id
 AND student.matricule = demo.student_matricule
JOIN identity.users teacher ON teacher.matricule =
  CASE demo.course_code WHEN 'INF501' THEN 'TEST-1001' ELSE 'TEST-1002' END
JOIN ref.course_teacher ct
  ON ct.course_id = co.id AND ct.teacher_id = teacher.id
ON CONFLICT (assessment_id, student_id) DO NOTHING;

WITH demo(course_code, teacher_matricule, date, libelle) AS (
  VALUES
    ('INF501', 'TEST-1001', DATE '2026-10-12', 'TEST - CM du 12/10/2026'),
    ('INF501', 'TEST-1001', DATE '2026-10-14', 'TEST - TD du 14/10/2026'),
    ('INF502', 'TEST-1002', DATE '2026-10-13', 'TEST - CM du 13/10/2026')
)
INSERT INTO academic.attendance_sessions (course_id, created_by, date, libelle)
SELECT co.id, teacher.id, demo.date, demo.libelle
FROM demo
JOIN ref.ue ue ON ue.code = demo.course_code
JOIN ref.course co
  ON co.ue_id = ue.id
 AND co.annee_universitaire = '2026-2027'
 AND co.semestre = 5
JOIN identity.users teacher ON teacher.matricule = demo.teacher_matricule
JOIN ref.course_teacher ct
  ON ct.course_id = co.id AND ct.teacher_id = teacher.id
WHERE NOT EXISTS (
  SELECT 1 FROM academic.attendance_sessions existing
  WHERE existing.course_id = co.id
    AND existing.date = demo.date
    AND existing.libelle = demo.libelle
);

WITH demo(course_code, session_label, student_matricule, statut) AS (
  VALUES
    ('INF501', 'TEST - CM du 12/10/2026', 'TEST-0001', 'present'),
    ('INF501', 'TEST - CM du 12/10/2026', 'TEST-0002', 'retard'),
    ('INF501', 'TEST - CM du 12/10/2026', 'TEST-0003', 'present'),
    ('INF501', 'TEST - CM du 12/10/2026', 'TEST-0004', 'absent'),
    ('INF501', 'TEST - CM du 12/10/2026', 'TEST-0005', 'present'),
    ('INF501', 'TEST - TD du 14/10/2026', 'TEST-0001', 'retard'),
    ('INF501', 'TEST - TD du 14/10/2026', 'TEST-0002', 'present'),
    ('INF501', 'TEST - TD du 14/10/2026', 'TEST-0003', 'absent'),
    ('INF501', 'TEST - TD du 14/10/2026', 'TEST-0004', 'present'),
    ('INF501', 'TEST - TD du 14/10/2026', 'TEST-0005', 'retard'),
    ('INF502', 'TEST - CM du 13/10/2026', 'TEST-0001', 'present'),
    ('INF502', 'TEST - CM du 13/10/2026', 'TEST-0002', 'absent'),
    ('INF502', 'TEST - CM du 13/10/2026', 'TEST-0003', 'retard')
)
INSERT INTO academic.attendance_records
  (session_id, course_id, student_id, statut, updated_by)
SELECT s.id, co.id, student.id, demo.statut, teacher.id
FROM demo
JOIN ref.ue ue ON ue.code = demo.course_code
JOIN ref.course co
  ON co.ue_id = ue.id
 AND co.annee_universitaire = '2026-2027'
 AND co.semestre = 5
JOIN academic.attendance_sessions s
  ON s.course_id = co.id AND s.libelle = demo.session_label
JOIN ref.enrollment enrollment ON enrollment.course_id = co.id
JOIN identity.users student
  ON student.id = enrollment.student_id
 AND student.matricule = demo.student_matricule
JOIN identity.users teacher ON teacher.matricule =
  CASE demo.course_code WHEN 'INF501' THEN 'TEST-1001' ELSE 'TEST-1002' END
JOIN ref.course_teacher ct
  ON ct.course_id = co.id AND ct.teacher_id = teacher.id
ON CONFLICT (session_id, student_id) DO NOTHING;

COMMIT;
