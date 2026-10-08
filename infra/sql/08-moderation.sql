-- Journal d'audit : l'application peut ajouter des lignes, jamais les modifier
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.journal (
  id          BIGSERIAL PRIMARY KEY,
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     INT,
  action      TEXT NOT NULL,
  campaign_id INT,
  course_id   INT,
  objet       TEXT,
  detail      TEXT
);

GRANT USAGE ON SCHEMA audit TO app_main;
GRANT SELECT, INSERT ON audit.journal TO app_main;
GRANT USAGE ON SEQUENCE audit.journal_id_seq TO app_main;

-- Restitution aux etudiants (article 77) : une par campagne, definitive
CREATE TABLE IF NOT EXISTS evaluation.restitutions (
  campaign_id INT PRIMARY KEY REFERENCES evaluation.campaigns(id),
  resultats   TEXT NOT NULL CHECK (length(resultats) BETWEEN 1 AND 3000),
  suites      TEXT NOT NULL CHECK (length(suites) BETWEEN 1 AND 3000),
  publie_le   TIMESTAMPTZ NOT NULL DEFAULT now(),
  publie_par  INT NOT NULL REFERENCES identity.users(id)
);

GRANT SELECT, INSERT ON evaluation.restitutions TO app_main;
REVOKE UPDATE, DELETE, TRUNCATE ON evaluation.restitutions FROM app_main;

-- Moderation : ne modifie QUE la colonne statut, jamais le texte, et laisse
-- une trace dans le meme appel. p_seuil : nombre minimal de bulletins pour
-- que les commentaires d'une UE soient moderables.
CREATE OR REPLACE FUNCTION evaluation.moderer_commentaire(
  p_ballot UUID, p_type TEXT, p_statut TEXT, p_user INT, p_seuil INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  v_ancien  TEXT;
  v_campagne INT;
  v_course  INT;
  v_statut_campagne TEXT;
  v_pret    TIMESTAMPTZ;
  v_nombre  INT;
BEGIN
  IF p_statut NOT IN ('valide', 'masque') THEN RETURN 'statut_invalide'; END IF;

  SELECT cm.statut, b.campaign_id, b.course_id, c.statut, c.urne_melangee_le
    INTO v_ancien, v_campagne, v_course, v_statut_campagne, v_pret
  FROM ballot.ballot_comments cm
  JOIN ballot.ballots b ON b.id = cm.ballot_id
  JOIN evaluation.campaigns c ON c.id = b.campaign_id
  WHERE cm.ballot_id = p_ballot AND cm.type = p_type
  FOR UPDATE OF cm;
  IF NOT FOUND THEN RETURN 'introuvable'; END IF;

  IF v_statut_campagne NOT IN ('close', 'restituee') OR v_pret IS NULL THEN
    RETURN 'non_modifiable';
  END IF;

  SELECT count(*)::int INTO v_nombre
  FROM ballot.ballots WHERE campaign_id = v_campagne AND course_id = v_course;
  IF v_nombre < p_seuil THEN RETURN 'introuvable'; END IF;

  IF v_ancien = p_statut THEN RETURN 'inchange'; END IF;

  UPDATE ballot.ballot_comments SET statut = p_statut
  WHERE ballot_id = p_ballot AND type = p_type;

  INSERT INTO audit.journal (user_id, action, campaign_id, course_id, objet, detail)
  VALUES (p_user, 'moderation', v_campagne, v_course,
          p_ballot::text || '.' || p_type, v_ancien || ' -> ' || p_statut);
  RETURN 'ok';
END
$fn$;

REVOKE ALL ON FUNCTION evaluation.moderer_commentaire(UUID, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluation.moderer_commentaire(UUID, TEXT, TEXT, INT, INT) TO app_main;