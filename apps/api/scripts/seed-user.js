const { Pool } = require('pg');
const { hash } = require('@node-rs/argon2');

const ROLES = ['etudiant', 'delegue', 'enseignant', 'chef_departement', 'scolarite', 'admin'];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refuse : ce script est reserve au developpement.');
    process.exit(1);
  }

  const [matricule, role, motDePasse] = process.argv.slice(2);
  if (!matricule || !role || !motDePasse || !ROLES.includes(role)) {
    console.error('Usage : node --env-file=../../.env scripts/seed-user.js MATRICULE ROLE MOT_DE_PASSE');
    console.error('Roles possibles : ' + ROLES.join(', '));
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const empreinte = await hash(motDePasse);
    const email = matricule.toLowerCase() + '@example.com';
    const res = await pool.query(
      `INSERT INTO identity.users (matricule, email, nom, prenom, mot_de_passe_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (matricule) DO UPDATE
         SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash,
             tentatives_echouees = 0,
             verrouille_jusqua = NULL
       RETURNING id`,
      [matricule, email, 'TEST', role, empreinte],
    );
    const id = res.rows[0].id;
    await pool.query(
      `INSERT INTO identity.user_roles (user_id, role) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, role],
    );
    console.log('Compte pret : ' + matricule + ' (id ' + id + ') avec le role ' + role);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Echec : ' + err.message);
  process.exit(1);
});