-- infra/sql/008_step_a_multi_campus_imports.sql

BEGIN;

-- 1. Table de rattachement des Chefs de Département
CREATE TABLE IF NOT EXISTS academic.department_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES ref.department(id) ON DELETE CASCADE,
    academic_year_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_head_per_dept UNIQUE (department_id)
);

-- 2. Index pour les recherches de périmètre
CREATE INDEX IF NOT EXISTS idx_dept_heads_user ON academic.department_heads(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_heads_dept ON academic.department_heads(department_id);

-- 3. Mise à jour de la table user_roles pour lier aux tables ref.campus et ref.department
ALTER TABLE identity.user_roles 
ADD COLUMN IF NOT EXISTS campus_id INTEGER REFERENCES ref.campus(id),
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES ref.department(id);

COMMIT;