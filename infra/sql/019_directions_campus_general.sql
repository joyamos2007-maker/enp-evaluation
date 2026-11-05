BEGIN;

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

-- The former role had global scope and no campus assignment; preserve it as
-- Directeur général rather than assigning a campus arbitrarily.
INSERT INTO identity.user_roles (user_id, role, campus_id, department_id)
SELECT user_id, 'directeur_general', NULL, NULL
FROM identity.user_roles
WHERE role = 'direction_etudes'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM identity.user_roles
WHERE role = 'direction_etudes';

ALTER TABLE identity.user_roles
  ADD CONSTRAINT user_roles_role_check
    CHECK (role IN (
      'etudiant', 'delegue', 'enseignant', 'chef_departement',
      'scolarite', 'directeur_campus', 'directeur_general', 'admin'
    )),
  ADD CONSTRAINT user_roles_directeur_campus_scope_check
    CHECK (
      role <> 'directeur_campus'
      OR (campus_id IS NOT NULL AND department_id IS NULL)
    ),
  ADD CONSTRAINT user_roles_directeur_general_scope_check
    CHECK (
      role <> 'directeur_general'
      OR (campus_id IS NULL AND department_id IS NULL)
    ),
  ADD CONSTRAINT user_roles_scolarite_campus_check
    CHECK (role <> 'scolarite' OR campus_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT user_roles_chef_departement_department_check
    CHECK (role <> 'chef_departement' OR department_id IS NOT NULL) NOT VALID;

COMMIT;
