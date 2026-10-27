-- Anti-rejeu : jetons de vote deja utilises (aucun lien avec un etudiant)
CREATE TABLE IF NOT EXISTS ballot.used_tokens (
  jti       UUID PRIMARY KEY,
  expire_le TIMESTAMPTZ NOT NULL
);

-- Commentaires libres : anonymes, a moderer
CREATE TABLE IF NOT EXISTS ballot.ballot_comments (
  ballot_id UUID NOT NULL REFERENCES ballot.ballots(id),
  type      TEXT NOT NULL CHECK (type IN ('points_forts', 'points_a_ameliorer')),
  texte     TEXT NOT NULL CHECK (length(texte) BETWEEN 1 AND 2000),
  statut    TEXT NOT NULL DEFAULT 'a_moderer'
            CHECK (statut IN ('a_moderer', 'valide', 'masque')),
  PRIMARY KEY (ballot_id, type)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ballot_app') THEN
    CREATE ROLE ballot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_main') THEN
    CREATE ROLE app_main LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- ballot_app : depose dans l'urne. Ni registre, ni identites, ni referentiels.
GRANT USAGE ON SCHEMA ballot TO ballot_app;
GRANT INSERT ON ballot.ballots, ballot.ballot_answers,
                ballot.ballot_comments, ballot.used_tokens TO ballot_app;
GRANT USAGE ON SCHEMA evaluation TO ballot_app;
GRANT SELECT ON evaluation.campaigns, evaluation.sections, evaluation.criteria TO ballot_app;

-- app_main : tout le reste de l'application, mais jamais l'urne
GRANT USAGE ON SCHEMA identity, ref, evaluation TO app_main;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity, ref, evaluation TO app_main;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity, ref, evaluation TO app_main;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, ref, evaluation
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_main;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, ref, evaluation
  GRANT USAGE, SELECT ON SEQUENCES TO app_main;
REVOKE ALL ON SCHEMA ballot FROM app_main;
REVOKE ALL ON ALL TABLES IN SCHEMA ballot FROM app_main;