import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async trouverParIdentifiant(identifiant: string): Promise<Utilisateur | null> {
    const rows = await this.db.query<Utilisateur>(
      `SELECT id, matricule, email, nom, prenom, mot_de_passe_hash, actif,
              tentatives_echouees, verrouille_jusqua
       FROM identity.users
       WHERE matricule = $1 OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifiant],
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
}