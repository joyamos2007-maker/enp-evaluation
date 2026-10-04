const { Pool } = require('pg');
const { hash } = require('@node-rs/argon2');

async function main() {
  const motDePasse = process.argv[2];
  if (!motDePasse) {
    console.error('Usage : node --env-file=../../.env scripts/seed-test-user.js MOT_DE_PASSE');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const empreinte = await hash(motDePasse);
    const res = await pool.query(
      `INSERT INTO identity.users (matricule, email, nom, prenom, mot_de_passe_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (matricule) DO UPDATE
         SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash,
             tentatives_echouees = 0,
             verrouille_jusqua = NULL
       RETURNING id`,
      ['TEST-0001', 'test.etudiant@example.com', 'TEST', 'Etudiant', empreinte],
    );
    const id = res.rows[0].id;
    await pool.query(
      `INSERT INTO identity.user_roles (user_id, role) VALUES ($1, 'etudiant')
       ON CONFLICT DO NOTHING`,
      [id],
    );
    console.log('Compte de test pret : matricule TEST-0001, id ' + id);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Echec : ' + err.message);
  process.exit(1);
});