BEGIN;

CREATE TABLE IF NOT EXISTS academic.department_campaign_reviews (
  campaign_id     INT PRIMARY KEY REFERENCES evaluation.campaigns(id) ON DELETE CASCADE,
  department_id   INT NOT NULL REFERENCES ref.department(id) ON DELETE CASCADE,
  meilleures_ue   TEXT NOT NULL DEFAULT '' CHECK (length(meilleures_ue) <= 3000),
  ue_attention    TEXT NOT NULL DEFAULT '' CHECK (length(ue_attention) <= 3000),
  actions         TEXT NOT NULL DEFAULT '' CHECK (length(actions) <= 3000),
  etabli_par      TEXT NOT NULL DEFAULT '' CHECK (length(etabli_par) <= 200),
  date_revue      DATE NOT NULL DEFAULT CURRENT_DATE,
  visa_chef       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by      INT NOT NULL REFERENCES identity.users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS department_campaign_reviews_department_idx
  ON academic.department_campaign_reviews (department_id, updated_at DESC);

GRANT USAGE ON SCHEMA academic TO app_main;
GRANT SELECT, INSERT ON academic.department_campaign_reviews TO app_main;
GRANT UPDATE (
  meilleures_ue, ue_attention, actions, etabli_par, date_revue,
  visa_chef, updated_by, updated_at
) ON academic.department_campaign_reviews TO app_main;

COMMIT;
