BEGIN;

ALTER TABLE academic.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_statut_check;

ALTER TABLE academic.attendance_records
  ADD CONSTRAINT attendance_records_statut_check
  CHECK (statut IN ('present', 'absent', 'retard', 'justifie'));

COMMIT;
