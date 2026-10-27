ALTER TABLE evaluation.campaigns ADD COLUMN IF NOT EXISTS urne_melangee_le TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'results_app') THEN
    CREATE ROLE results_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- results_app : lecture seule de l urne. Ni registre, ni identites, ni referentiels.
GRANT USAGE ON SCHEMA ballot TO results_app;
GRANT SELECT ON ballot.ballots, ballot.ballot_answers, ballot.ballot_comments TO results_app;
GRANT USAGE ON SCHEMA evaluation TO results_app;
GRANT SELECT (id, statut, urne_melangee_le) ON evaluation.campaigns TO results_app;
GRANT SELECT ON evaluation.sections, evaluation.criteria TO results_app;

-- Prepare l urne d une campagne close : melange physique des lignes et purge
-- des jetons expires. Retourne 'prete', 'attente', 'ouverte' ou 'inconnue'.
CREATE OR REPLACE FUNCTION evaluation.preparer_resultats(p_campagne INT, p_delai_secondes INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  v_statut TEXT;
  v_close  TIMESTAMPTZ;
  v_pret   TIMESTAMPTZ;
  v_id     INT;
BEGIN
  SELECT c.statut, c.close_le, c.urne_melangee_le
    INTO v_statut, v_close, v_pret
  FROM evaluation.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND THEN RETURN 'inconnue'; END IF;
  IF v_statut NOT IN ('close', 'restituee') THEN RETURN 'ouverte'; END IF;
  IF v_pret IS NOT NULL THEN RETURN 'prete'; END IF;
  IF v_close IS NOT NULL AND v_close > now() - make_interval(secs => p_delai_secondes) THEN
    RETURN 'attente';
  END IF;

  -- Un seul appel fait la preparation (verrou de ligne)
  UPDATE evaluation.campaigns SET urne_melangee_le = now()
   WHERE id = p_campagne AND urne_melangee_le IS NULL
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN 'prete'; END IF;

  CREATE TEMP TABLE tmp_b ON COMMIT DROP AS
    SELECT * FROM ballot.ballots WHERE campaign_id = p_campagne;
  CREATE TEMP TABLE tmp_a ON COMMIT DROP AS
    SELECT a.* FROM ballot.ballot_answers a WHERE a.ballot_id IN (SELECT id FROM tmp_b);
  CREATE TEMP TABLE tmp_c ON COMMIT DROP AS
    SELECT c.* FROM ballot.ballot_comments c WHERE c.ballot_id IN (SELECT id FROM tmp_b);

  DELETE FROM ballot.ballot_answers  WHERE ballot_id IN (SELECT id FROM tmp_b);
  DELETE FROM ballot.ballot_comments WHERE ballot_id IN (SELECT id FROM tmp_b);
  DELETE FROM ballot.ballots         WHERE id        IN (SELECT id FROM tmp_b);

  INSERT INTO ballot.ballots         SELECT * FROM tmp_b ORDER BY gen_random_uuid();
  INSERT INTO ballot.ballot_answers  SELECT * FROM tmp_a ORDER BY gen_random_uuid();
  INSERT INTO ballot.ballot_comments SELECT * FROM tmp_c ORDER BY gen_random_uuid();

  DELETE FROM ballot.used_tokens WHERE expire_le < now();
  RETURN 'prete';
END
$fn$;

REVOKE ALL ON FUNCTION evaluation.preparer_resultats(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluation.preparer_resultats(INT, INT) TO app_main;