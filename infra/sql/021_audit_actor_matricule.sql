BEGIN;

ALTER TABLE audit.journal
  ADD COLUMN IF NOT EXISTS user_matricule TEXT;

UPDATE audit.journal j
SET user_matricule = u.matricule
FROM identity.users u
WHERE j.user_id = u.id
  AND j.user_matricule IS NULL;

GRANT SELECT, INSERT ON audit.journal TO app_main;

COMMIT;
