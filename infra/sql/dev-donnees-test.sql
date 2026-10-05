-- DONNEES FICTIVES : developpement uniquement, jamais en production.
-- Le fichier peut etre relance sans creer de doublons.

-- 1. Comptes fictifs (sans mot de passe : a activer plus tard)
CREATE TEMP TABLE tmp_comptes (
  matricule TEXT, email TEXT, nom TEXT, prenom TEXT, role TEXT
);

INSERT INTO tmp_comptes VALUES
  ('TEST-0002', 'ama.koffi@exemple.test',     'KOFFI',     'Ama',    'etudiant'),
  ('TEST-0002', 'ama.koffi@exemple.test',     'KOFFI',     'Ama',    'delegue'),
  ('TEST-0003', 'kossi.mensah@exemple.test',  'MENSAH',    'Kossi',  'etudiant'),
  ('TEST-0004', 'efua.adjovi@exemple.test',   'ADJOVI',    'Efua',   'etudiant'),
  ('TEST-0005', 'yao.agbo@exemple.test',      'AGBO',      'Yao',    'etudiant'),
  ('TEST-1001', 'mawuli.attiogbe@exemple.test','ATTIOGBE',  'Mawuli', 'enseignant'),
  ('TEST-1002', 'esi.lawson@exemple.test',    'LAWSON',    'Esi',    'enseignant'),
  ('TEST-9001', 'scolarite@exemple.test',     'SCOLARITE', 'Test',   'scolarite');

INSERT INTO identity.users (matricule, email, nom, prenom, actif)
SELECT DISTINCT t.matricule, t.email, t.nom, t.prenom, TRUE
FROM tmp_comptes t
WHERE NOT EXISTS (
  SELECT 1 FROM identity.users u WHERE u.matricule = t.matricule
);

INSERT INTO identity.user_roles (user_id, role)
SELECT u.id, t.role
FROM tmp_comptes t
JOIN identity.users u ON u.matricule = t.matricule
WHERE NOT EXISTS (
  SELECT 1 FROM identity.user_roles r
  WHERE r.user_id = u.id AND r.role = t.role
);

-- 2. Structure
INSERT INTO ref.campus (nom) VALUES ('Campus de Lome')
ON CONFLICT DO NOTHING;

INSERT INTO ref.department (campus_id, nom)
SELECT c.id, 'Genie Informatique' FROM ref.campus c WHERE c.nom = 'Campus de Lome'
ON CONFLICT DO NOTHING;

INSERT INTO ref.program (department_id, nom)
SELECT d.id, 'Cycle Ingenieur'
FROM ref.department d
JOIN ref.campus c ON c.id = d.campus_id
WHERE c.nom = 'Campus de Lome' AND d.nom = 'Genie Informatique'
ON CONFLICT DO NOTHING;

INSERT INTO ref.ue (code, intitule, credits) VALUES
  ('INF501', 'Bases de donnees', 4),
  ('INF502', 'Genie logiciel', 3)
ON CONFLICT DO NOTHING;

INSERT INTO ref.course (ue_id, program_id, annee_universitaire, semestre)
SELECT u.id, p.id, '2026-2027', 5
FROM ref.ue u
CROSS JOIN ref.program p
WHERE u.code IN ('INF501', 'INF502') AND p.nom = 'Cycle Ingenieur'
ON CONFLICT DO NOTHING;

-- 3. Affectations des enseignants
INSERT INTO ref.course_teacher (course_id, teacher_id)
SELECT c.id, t.id
FROM (VALUES ('INF501', 'TEST-1001'), ('INF502', 'TEST-1002')) AS v(code, matricule)
JOIN ref.ue u ON u.code = v.code
JOIN ref.course c ON c.ue_id = u.id AND c.annee_universitaire = '2026-2027'
JOIN identity.users t ON t.matricule = v.matricule
ON CONFLICT DO NOTHING;

-- 4. Inscriptions : INF501 = 5 etudiants, INF502 = 3 etudiants
INSERT INTO ref.enrollment (course_id, student_id)
SELECT c.id, s.id
FROM (VALUES
  ('INF501', 'TEST-0001'), ('INF501', 'TEST-0002'), ('INF501', 'TEST-0003'),
  ('INF501', 'TEST-0004'), ('INF501', 'TEST-0005'),
  ('INF502', 'TEST-0001'), ('INF502', 'TEST-0002'), ('INF502', 'TEST-0003')
) AS v(code, matricule)
JOIN ref.ue u ON u.code = v.code
JOIN ref.course c ON c.ue_id = u.id AND c.annee_universitaire = '2026-2027'
JOIN identity.users s ON s.matricule = v.matricule
ON CONFLICT DO NOTHING;

-- 5. Delegue de la formation
INSERT INTO ref.class_delegate (program_id, annee_universitaire, student_id)
SELECT p.id, '2026-2027', s.id
FROM ref.program p, identity.users s
WHERE p.nom = 'Cycle Ingenieur' AND s.matricule = 'TEST-0002'
ON CONFLICT DO NOTHING;