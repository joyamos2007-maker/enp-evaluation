BEGIN;

CREATE TABLE IF NOT EXISTS academic.assessment_deliberations (
  assessment_id INT PRIMARY KEY
    REFERENCES academic.assessment_columns(id) ON DELETE CASCADE,
  deliberated_by INT NOT NULL REFERENCES identity.users(id),
  deliberated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT ON academic.assessment_deliberations TO app_main;

COMMIT;
