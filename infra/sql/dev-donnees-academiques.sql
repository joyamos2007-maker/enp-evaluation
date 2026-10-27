-- Données académiques fictives pour démonstration locale uniquement.
-- Relançable sans doublons; ne modifie ni les campus ni les campagnes existants.

BEGIN;

INSERT INTO ref.campus (nom) VALUES
  ('Campus de Kara'),
  ('Campus de Sokode')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO ref.department (campus_id, nom)
SELECT c.id, d.nom
FROM (VALUES
  ('Campus de Lome', 'Genie Civil'),
  ('Campus de Kara', 'Genie Electrique'),
  ('Campus de Kara', 'Informatique'),
  ('Campus de Sokode', 'Genie Mecanique')
) AS d(campus, nom)
JOIN ref.campus c ON c.nom = d.campus
ON CONFLICT (campus_id, nom) DO NOTHING;

INSERT INTO ref.program (department_id, nom)
SELECT d.id, p.nom
FROM (VALUES
  ('Campus de Lome', 'Genie Informatique', 'Cycle Preparatoire'),
  ('Campus de Lome', 'Genie Civil', 'Cycle Ingenieur'),
  ('Campus de Kara', 'Genie Electrique', 'Cycle Ingenieur'),
  ('Campus de Kara', 'Informatique', 'Cycle Ingenieur'),
  ('Campus de Sokode', 'Genie Mecanique', 'Cycle Ingenieur')
) AS p(campus, departement, nom)
JOIN ref.campus c ON c.nom = p.campus
JOIN ref.department d ON d.campus_id = c.id AND d.nom = p.departement
ON CONFLICT (department_id, nom) DO NOTHING;

INSERT INTO ref.ue (code, intitule, credits) VALUES
  ('DEMO-MAT101', 'Mathematiques generales', 5),
  ('DEMO-GC501', 'Conception des structures', 4),
  ('DEMO-GE501', 'Systemes electriques', 4),
  ('DEMO-KI501', 'Systemes informatiques', 3),
  ('DEMO-GM501', 'Mecanique appliquee', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO ref.course (ue_id, program_id, annee_universitaire, semestre)
SELECT ue.id, pr.id, '2026-2027', p.semestre
FROM (VALUES
  ('Campus de Lome', 'Genie Informatique', 'Cycle Ingenieur', 'INF501', 5),
  ('Campus de Lome', 'Genie Informatique', 'Cycle Ingenieur', 'INF502', 5),
  ('Campus de Lome', 'Genie Informatique', 'Cycle Preparatoire', 'DEMO-MAT101', 1),
  ('Campus de Lome', 'Genie Civil', 'Cycle Ingenieur', 'DEMO-GC501', 5),
  ('Campus de Kara', 'Genie Electrique', 'Cycle Ingenieur', 'DEMO-GE501', 5),
  ('Campus de Kara', 'Informatique', 'Cycle Ingenieur', 'DEMO-KI501', 5),
  ('Campus de Sokode', 'Genie Mecanique', 'Cycle Ingenieur', 'DEMO-GM501', 5)
) AS p(campus, departement, programme, code_ue, semestre)
JOIN ref.campus c ON c.nom = p.campus
JOIN ref.department d ON d.campus_id = c.id AND d.nom = p.departement
JOIN ref.program pr ON pr.department_id = d.id AND pr.nom = p.programme
JOIN ref.ue ue ON ue.code = p.code_ue
ON CONFLICT (ue_id, program_id, annee_universitaire, semestre) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM evaluation.questionnaire_versions WHERE actif) THEN
    RAISE EXCEPTION 'Aucune version active du questionnaire; appliquer infra/sql/05-evaluation.sql avant les données de démonstration';
  END IF;
END $$;

INSERT INTO evaluation.campaigns (
  libelle, department_id, annee_universitaire, semestre, version_id,
  debut, fin, statut
)
SELECT
  'DEMO - Evaluation ' || d.nom || ' - S' || p.semestre,
  d.id,
  '2026-2027',
  p.semestre,
  q.id,
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '30 days',
  'brouillon'
FROM (VALUES
  ('Campus de Lome', 'Genie Informatique', 1),
  ('Campus de Lome', 'Genie Civil', 5),
  ('Campus de Kara', 'Genie Electrique', 5),
  ('Campus de Kara', 'Informatique', 5),
  ('Campus de Sokode', 'Genie Mecanique', 5)
) AS p(campus, departement, semestre)
JOIN ref.campus c ON c.nom = p.campus
JOIN ref.department d ON d.campus_id = c.id AND d.nom = p.departement
JOIN ref.program pr ON pr.department_id = d.id
JOIN ref.course co
  ON co.program_id = pr.id
 AND co.annee_universitaire = '2026-2027'
 AND co.semestre = p.semestre
CROSS JOIN LATERAL (
  SELECT id FROM evaluation.questionnaire_versions WHERE actif ORDER BY id LIMIT 1
) q
GROUP BY d.id, d.nom, p.semestre, q.id
ON CONFLICT (department_id, annee_universitaire, semestre) DO NOTHING;

COMMIT;
