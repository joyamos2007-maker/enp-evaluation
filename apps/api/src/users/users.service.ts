import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DUREE_VERROUILLAGE_MINUTES, MAX_ECHECS } from './users.constants';


export interface Utilisateur {
  id: number;
  matricule: string | null;
  email: string | null;
  nom: string;
  prenom: string;
  mot_de_passe_hash: string | null;
  actif: boolean;
  tentatives_echouees: number;
  verrouille_jusqua: Date | null;
}

const COLONNES = `id, matricule, email, nom, prenom, mot_de_passe_hash, actif,
                  tentatives_echouees, verrouille_jusqua`;

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async trouverParIdentifiant(identifiant: string): Promise<Utilisateur | null> {
    const rows = await this.db.query<Utilisateur>(
      `SELECT ${COLONNES}
       FROM identity.users
       WHERE matricule = $1 OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifiant],
    );
    return rows[0] ?? null;
  }

  async trouverParId(id: number): Promise<Utilisateur | null> {
    const rows = await this.db.query<Utilisateur>(
      `SELECT ${COLONNES} FROM identity.users WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async rolesDe(userId: number): Promise<string[]> {
    const rows = await this.db.query<{ role: string }>(
      'SELECT role FROM identity.user_roles WHERE user_id = $1 ORDER BY role',
      [userId],
    );
    return rows.map((r) => r.role);
  }

  // Une seule requete atomique : le compteur monte, et au seuil le compte
  // est verrouille puis le compteur repart a zero.
  async enregistrerEchec(userId: number): Promise<void> {
    await this.db.query(
      `UPDATE identity.users
       SET tentatives_echouees = CASE WHEN tentatives_echouees + 1 >= $2::int
                                      THEN 0 ELSE tentatives_echouees + 1 END,
           verrouille_jusqua = CASE WHEN tentatives_echouees + 1 >= $2::int
                                    THEN NOW() + make_interval(mins => $3::int)
                                    ELSE verrouille_jusqua END
       WHERE id = $1`,
      [userId, MAX_ECHECS, DUREE_VERROUILLAGE_MINUTES],
    );
  }

  async reinitialiserEchecs(userId: number): Promise<void> {
    await this.db.query(
      'UPDATE identity.users SET tentatives_echouees = 0, verrouille_jusqua = NULL WHERE id = $1',
      [userId],
    );
  }
}