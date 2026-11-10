BEGIN;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE audit.journal
  ADD COLUMN IF NOT EXISTS campus_id INT REFERENCES ref.campus(id);

GRANT SELECT, UPDATE ON identity.users TO app_main;
GRANT UPDATE ON identity.refresh_tokens TO app_main;
GRANT DELETE ON identity.user_roles TO app_main;
GRANT DELETE ON identity.account_tokens, identity.user_mfa,
  identity.mfa_challenges, identity.mfa_trusted_devices TO app_main;
GRANT DELETE ON identity.email_change_requests TO app_main;
GRANT UPDATE ON system.email_outbox TO app_main;
GRANT INSERT ON audit.journal TO app_main;

COMMIT;
