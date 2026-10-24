import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { DUREE_INACTIVITE_MINUTES, DUREE_SESSION_HEURES } from './session.constants';

export interface SessionEmise {
  jeton: string;
  expireLe: Date;
}

export interface SessionRenouvelee extends SessionEmise {
  userId: number;
  activeRole: string | null;
}

function empreinte(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}

function nouveauJeton(): string {
  return randomBytes(48).toString('base64url');
}

@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  // Ouvre une nouvelle session (nouvelle famille de jetons)
  async creer(userId: number, activeRole: string | null): Promise<SessionEmise> {
    const jeton = nouveauJeton();
    const rows = await this.db.query<{ inactif_apres: Date }>(
      `INSERT INTO identity.refresh_tokens
         (user_id, famille_id, jeton_hash, inactif_apres, expire_le, active_role)
       VALUES ($1, $2, $3,
               LEAST(NOW() + make_interval(mins => $4::int),
                     NOW() + make_interval(hours => $5::int)),
               NOW() + make_interval(hours => $5::int), $6)
       RETURNING inactif_apres`,
      [userId, randomUUID(), empreinte(jeton), DUREE_INACTIVITE_MINUTES, DUREE_SESSION_HEURES, activeRole],
    );
    return { jeton, expireLe: rows[0].inactif_apres };
  }

  // Une seule requete : l ancien jeton est marque remplace ET le nouveau est cree
  async renouveler(jetonBrut: string): Promise<SessionRenouvelee> {
    const ancienne = empreinte(jetonBrut);
    const nouveau = nouveauJeton();
    const rows = await this.db.query<{ user_id: number; inactif_apres: Date; active_role: string | null }>(
      `WITH ancien AS (
         UPDATE identity.refresh_tokens
         SET remplace_le = NOW()
         WHERE jeton_hash = $1
           AND remplace_le IS NULL
           AND revoque_le IS NULL
           AND inactif_apres > NOW()
           AND expire_le > NOW()
         RETURNING user_id, famille_id, expire_le, active_role
       )
       INSERT INTO identity.refresh_tokens
         (user_id, famille_id, jeton_hash, inactif_apres, expire_le, active_role)
       SELECT user_id, famille_id, $2::text,
              LEAST(NOW() + make_interval(mins => $3::int), expire_le),
              expire_le, active_role
       FROM ancien
       RETURNING user_id, inactif_apres, active_role`,
      [ancienne, empreinte(nouveau), DUREE_INACTIVITE_MINUTES],
    );

    if (rows.length === 0) {
      await this.traiterEchec(ancienne);
      throw new UnauthorizedException('Session expiree, reconnectez-vous');
    }
    return {
      userId: rows[0].user_id,
      jeton: nouveau,
      expireLe: rows[0].inactif_apres,
      activeRole: rows[0].active_role,
    };
  }

  async changerProfil(jetonBrut: string, userId: number, activeRole: string): Promise<boolean> {
    const rows = await this.db.query<{ id: number }>(
      `UPDATE identity.refresh_tokens
       SET active_role = $3
       WHERE jeton_hash = $1 AND user_id = $2
         AND remplace_le IS NULL AND revoque_le IS NULL
         AND inactif_apres > NOW() AND expire_le > NOW()
       RETURNING id`,
      [empreinte(jetonBrut), userId, activeRole],
    );
    return rows.length > 0;
  }

  async revoquer(jetonBrut: string): Promise<void> {
    await this.revoquerFamille(empreinte(jetonBrut));
  }

  // Un jeton deja remplace qui revient : vol probable, on coupe toute la famille
  private async traiterEchec(empreinteJeton: string): Promise<void> {
    const rows = await this.db.query<{ remplace_le: Date | null; revoque_le: Date | null }>(
      'SELECT remplace_le, revoque_le FROM identity.refresh_tokens WHERE jeton_hash = $1',
      [empreinteJeton],
    );
    const ligne = rows[0];
    if (ligne && ligne.remplace_le && !ligne.revoque_le) {
      await this.revoquerFamille(empreinteJeton);
    }
  }

  private async revoquerFamille(empreinteJeton: string): Promise<void> {
    await this.db.query(
      `UPDATE identity.refresh_tokens
       SET revoque_le = NOW()
       WHERE revoque_le IS NULL
         AND famille_id = (SELECT famille_id FROM identity.refresh_tokens WHERE jeton_hash = $1)`,
      [empreinteJeton],
    );
  }
}