SET client_encoding = 'UTF8';

-- Questionnaire versionne
CREATE TABLE IF NOT EXISTS evaluation.questionnaire_versions (
  id      SERIAL PRIMARY KEY,
  libelle TEXT        NOT NULL UNIQUE,
  actif   BOOLEAN     NOT NULL DEFAULT FALSE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule version active a la fois
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_versions_un_seul_actif
  ON evaluation.questionnaire_versions ((TRUE)) WHERE actif;

CREATE TABLE IF NOT EXISTS evaluation.sections (
  id         SERIAL PRIMARY KEY,
  version_id INT      NOT NULL REFERENCES evaluation.questionnaire_versions(id),
  code       TEXT     NOT NULL CHECK (code ~ '^[A-E]$'),
  titre      TEXT     NOT NULL,
  ordre      SMALLINT NOT NULL,
  UNIQUE (version_id, code)
);

CREATE TABLE IF NOT EXISTS evaluation.criteria (
  id         SERIAL PRIMARY KEY,
  section_id INT      NOT NULL REFERENCES evaluation.sections(id),
  code       TEXT     NOT NULL,
  libelle    TEXT     NOT NULL,
  ordre      SMALLINT NOT NULL,
  UNIQUE (section_id, code)
);

CREATE TABLE IF NOT EXISTS evaluation.comment_fields (
  version_id INT      NOT NULL REFERENCES evaluation.questionnaire_versions(id),
  type       TEXT     NOT NULL CHECK (type IN ('points_forts', 'points_a_ameliorer')),
  libelle    TEXT     NOT NULL,
  ordre      SMALLINT NOT NULL,
  PRIMARY KEY (version_id, type)
);

-- Campagnes d'evaluation
CREATE TABLE IF NOT EXISTS evaluation.campaigns (
  id                  SERIAL PRIMARY KEY,
  libelle             TEXT        NOT NULL,
  department_id       INT         NOT NULL REFERENCES ref.department(id),
  annee_universitaire TEXT        NOT NULL CHECK (annee_universitaire ~ '^[0-9]{4}-[0-9]{4}$'),
  semestre            SMALLINT    NOT NULL CHECK (semestre BETWEEN 1 AND 10),
  version_id          INT         NOT NULL REFERENCES evaluation.questionnaire_versions(id),
  debut               TIMESTAMPTZ NOT NULL,
  fin                 TIMESTAMPTZ NOT NULL,
  statut              TEXT        NOT NULL DEFAULT 'brouillon'
                      CHECK (statut IN ('brouillon', 'ouverte', 'close', 'restituee')),
  cree_le             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ouverte_le          TIMESTAMPTZ,
  close_le            TIMESTAMPTZ,
  CHECK (fin > debut),
  UNIQUE (department_id, annee_universitaire, semestre)
);

-- Cles etrangeres sur le registre et l'urne.
-- L'urne ne reference JAMAIS un etudiant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participation_ledger_campaign_fk') THEN
    ALTER TABLE evaluation.participation_ledger
      ADD CONSTRAINT participation_ledger_campaign_fk
      FOREIGN KEY (campaign_id) REFERENCES evaluation.campaigns(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participation_ledger_course_fk') THEN
    ALTER TABLE evaluation.participation_ledger
      ADD CONSTRAINT participation_ledger_course_fk
      FOREIGN KEY (course_id) REFERENCES ref.course(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participation_ledger_student_fk') THEN
    ALTER TABLE evaluation.participation_ledger
      ADD CONSTRAINT participation_ledger_student_fk
      FOREIGN KEY (student_id) REFERENCES identity.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballots_campaign_fk') THEN
    ALTER TABLE ballot.ballots
      ADD CONSTRAINT ballots_campaign_fk
      FOREIGN KEY (campaign_id) REFERENCES evaluation.campaigns(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballots_course_fk') THEN
    ALTER TABLE ballot.ballots
      ADD CONSTRAINT ballots_course_fk
      FOREIGN KEY (course_id) REFERENCES ref.course(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballots_version_fk') THEN
    ALTER TABLE ballot.ballots
      ADD CONSTRAINT ballots_version_fk
      FOREIGN KEY (version_id) REFERENCES evaluation.questionnaire_versions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballot_answers_criterion_fk') THEN
    ALTER TABLE ballot.ballot_answers
      ADD CONSTRAINT ballot_answers_criterion_fk
      FOREIGN KEY (criterion_id) REFERENCES evaluation.criteria(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ballots_campagne_cours_idx
  ON ballot.ballots (campaign_id, course_id);

-- Questionnaire officiel de l'ENP (version 1)
DO $$
DECLARE
  v_id INT;
BEGIN
  INSERT INTO evaluation.questionnaire_versions (libelle, actif)
  VALUES ('Grille ENP v1', TRUE)
  ON CONFLICT (libelle) DO NOTHING;

  SELECT id INTO v_id FROM evaluation.questionnaire_versions WHERE libelle = 'Grille ENP v1';

  INSERT INTO evaluation.sections (version_id, code, titre, ordre) VALUES
    (v_id, 'A', 'Organisation et contenu de l''enseignement', 1),
    (v_id, 'B', 'Qualité pédagogique de l''enseignant', 2),
    (v_id, 'C', 'Évaluation et retour pédagogique', 3),
    (v_id, 'D', 'Moyens et conditions matérielles', 4),
    (v_id, 'E', 'Appréciation globale', 5)
  ON CONFLICT (version_id, code) DO NOTHING;

  INSERT INTO evaluation.criteria (section_id, code, libelle, ordre)
  SELECT s.id, c.code, c.libelle, c.ordre
  FROM (VALUES
    ('A', 'A1', 'Les objectifs de l''UE ont été clairement présentés en début de semestre', 1),
    ('A', 'A2', 'Le contenu enseigné correspondait au syllabus communiqué', 2),
    ('A', 'A3', 'La progression des séances était cohérente et bien structurée', 3),
    ('A', 'A4', 'La charge de travail demandée était adaptée au nombre de crédits de l''UE', 4),
    ('A', 'A5', 'Les liens avec les autres UE du semestre étaient explicites', 5),
    ('B', 'B1', 'Les explications étaient claires et compréhensibles', 1),
    ('B', 'B2', 'L''enseignant était disponible et accessible en dehors des séances', 2),
    ('B', 'B3', 'L''enseignant répondait de façon satisfaisante aux questions posées', 3),
    ('B', 'B4', 'Les supports pédagogiques (polycopiés, diapositives, exercices) étaient utiles et de qualité', 4),
    ('B', 'B5', 'Le rythme des séances permettait une bonne assimilation du contenu', 5),
    ('C', 'C1', 'Les modalités d''évaluation avaient été clairement communiquées en début de semestre', 1),
    ('C', 'C2', 'Les épreuves étaient cohérentes avec le contenu réellement enseigné', 2),
    ('C', 'C3', 'Les corrections et les résultats ont été communiqués dans un délai raisonnable', 3),
    ('C', 'C4', 'Les retours reçus ont permis de comprendre mes erreurs et de progresser', 4),
    ('D', 'D1', 'Les salles de cours/TD étaient adaptées (capacité, confort, équipement)', 1),
    ('D', 'D2', 'Les équipements de travaux pratiques étaient suffisants et fonctionnels', 2),
    ('D', 'D3', 'Les ressources numériques (plateforme, documents en ligne) étaient accessibles', 3),
    ('E', 'E1', 'De façon générale, je suis satisfait(e) de cette unité d''enseignement', 1),
    ('E', 'E2', 'Je recommanderais cette UE, telle qu''enseignée, à un autre étudiant', 2)
  ) AS c(section, code, libelle, ordre)
  JOIN evaluation.sections s ON s.version_id = v_id AND s.code = c.section
  ON CONFLICT (section_id, code) DO NOTHING;

  INSERT INTO evaluation.comment_fields (version_id, type, libelle, ordre) VALUES
    (v_id, 'points_forts', 'Points forts de l''enseignement', 1),
    (v_id, 'points_a_ameliorer', 'Points à améliorer / suggestions', 2)
  ON CONFLICT (version_id, type) DO NOTHING;
END $$;