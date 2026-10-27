const { Pool } = require('pg');
const { hash } = require('@node-rs/argon2');

const ROLES = ['etudiant', 'delegue', 'enseignant', 'chef_departement', 'scolarite', 'direction_etudes', 'admin'];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refuse : ce script est reserve au developpement.');
    process.exit(1);
  }

  const [matricule, role, motDePasse, rawScopeId] = process.argv.slice(2);
  const scopeId = rawScopeId === undefined ? null : Number(rawScopeId);
  const scopeRequired = role === 'scolarite' || role === 'chef_departement';
  if (
    !matricule || !role || !motDePasse || !ROLES.includes(role) ||
    (scopeRequired && (!Number.isSafeInteger(scopeId) || scopeId < 1)) ||
    (!scopeRequired && rawScopeId !== undefined)
  ) {
    console.error('Usage : node --env-file=../../.env scripts/seed-user.js MATRICULE ROLE MOT_DE_PASSE [CAMPUS_ID|DEPARTMENT_ID]');
    console.error('Un CAMPUS_ID est requis pour scolarite, un DEPARTMENT_ID pour chef_departement.');
    console.error('Roles possibles : ' + ROLES.join(', '));
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const empreinte = await hash(motDePasse);
    const email = matricule.toLowerCase() + '@example.com';
    const res = await pool.query(
      `WITH perimetre AS (
         SELECT CASE WHEN $2 = 'scolarite' THEN $3::int END AS campus_id,
                CASE WHEN $2 = 'chef_departement' THEN $3::int END AS department_id
         WHERE ($2 <> 'scolarite' OR EXISTS (
                  SELECT 1 FROM ref.campus WHERE id = $3::int))
           AND ($2 <> 'chef_departement' OR EXISTS (
                  SELECT 1 FROM ref.department WHERE id = $3::int))
       ), compte AS (
         INSERT INTO identity.users (matricule, email, nom, prenom, mot_de_passe_hash)
         SELECT $1, $4, 'TEST', $2, $5 FROM perimetre
         ON CONFLICT (matricule) DO UPDATE
           SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash,
               tentatives_echouees = 0,
               verrouille_jusqua = NULL
         RETURNING id
       ), affectation AS (
         INSERT INTO identity.user_roles (user_id, role, campus_id, department_id)
         SELECT compte.id, $2, perimetre.campus_id, perimetre.department_id
         FROM compte CROSS JOIN perimetre
         ON CONFLICT (user_id, role) DO UPDATE
           SET campus_id = EXCLUDED.campus_id,
               department_id = EXCLUDED.department_id
         RETURNING user_id
       )
       SELECT compte.id FROM compte JOIN affectation ON affectation.user_id = compte.id`,
      [matricule, role, scopeId, email, empreinte],
    );
    const id = res.rows[0]?.id;
    if (id === undefined) {
      throw new Error('Périmètre introuvable : ' + scopeId);
    }
    console.log('Compte pret : ' + matricule + ' (id ' + id + ') avec le role ' + role);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Echec : ' + err.message);
  process.exit(1);
});