BEGIN;

ALTER TABLE identity.user_roles
  ADD COLUMN IF NOT EXISTS campus_id INTEGER REFERENCES ref.campus(id),
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES ref.department(id);

DO $$
DECLARE
  contrainte RECORD;
BEGIN
  FOR contrainte IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'identity.user_roles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE identity.user_roles DROP CONSTRAINT %I', contrainte.conname);
  END LOOP;
END $$;

ALTER TABLE identity.user_roles
  ADD CONSTRAINT user_roles_role_check
    CHECK (role IN (
      'etudiant', 'delegue', 'enseignant', 'chef_departement',
      'scolarite', 'direction_etudes', 'admin'
    )),
  ADD CONSTRAINT user_roles_direction_globale_check
    CHECK (role <> 'direction_etudes' OR (campus_id IS NULL AND department_id IS NULL)) NOT VALID,
  ADD CONSTRAINT user_roles_scolarite_campus_check
    CHECK (role <> 'scolarite' OR campus_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT user_roles_chef_departement_department_check
    CHECK (role <> 'chef_departement' OR department_id IS NOT NULL) NOT VALID;

CREATE TABLE IF NOT EXISTS evaluation.global_statistics_publications (
  id BIGSERIAL PRIMARY KEY,
  annee_universitaire TEXT NOT NULL
    CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  semestre SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 10),
  statistiques JSONB NOT NULL,
  publie_par INTEGER NOT NULL REFERENCES identity.users(id),
  publie_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS global_statistics_publications_period_idx
  ON evaluation.global_statistics_publications
    (annee_universitaire, semestre, publie_le DESC);

GRANT SELECT, INSERT ON evaluation.global_statistics_publications TO app_main;
GRANT USAGE, SELECT ON SEQUENCE evaluation.global_statistics_publications_id_seq TO app_main;

COMMIT;
