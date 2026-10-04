CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.users (
  id                  SERIAL PRIMARY KEY,
  matricule           VARCHAR(30)  UNIQUE,
  email               VARCHAR(255) UNIQUE,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  mot_de_passe_hash   TEXT,  -- vide tant que le compte n est pas active
  actif               BOOLEAN NOT NULL DEFAULT TRUE,
  tentatives_echouees INT NOT NULL DEFAULT 0,
  verrouille_jusqua   TIMESTAMPTZ,
  cree_le             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (matricule IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS identity.user_roles (
  user_id INT NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  role    VARCHAR(30) NOT NULL
          CHECK (role IN ('etudiant', 'delegue', 'enseignant',
                          'chef_departement', 'scolarite', 'admin')),
  PRIMARY KEY (user_id, role)
);