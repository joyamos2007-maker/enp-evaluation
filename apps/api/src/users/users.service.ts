import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DUREE_VERROUILLAGE_MINUTES, MAX_ECHECS } from './users.constants';
import { AuditService } from '../audit/audit.service';


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

export interface CompteAdmin {
  id: number;
  matricule: string | null;
  email: string | null;
  nom: string;
  prenom: string;
  actif: boolean;
  motDePasseConfigure: boolean;
  roles: string[];
}

const COLONNES = `id, matricule, email, nom, prenom, mot_de_passe_hash, actif,
                  tentatives_echouees, verrouille_jusqua`;

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async trouverParIdentifiant(identifiant: string): Promise<Utilisateur | null> {
    const rows = await this.db.query<Utilisateur>(
      `SELECT ${COLONNES}
       FROM identity.users
      WHERE deleted_at IS NULL
        AND (matricule = $1 OR LOWER(email) = LOWER($1))
       LIMIT 1`,
      [identifiant],
    );
    return rows[0] ?? null;
  }

  async trouverParId(id: number): Promise<Utilisateur | null> {
    const rows = await this.db.query<Utilisateur>(
      `SELECT ${COLONNES}
       FROM identity.users
       WHERE id = $1 AND deleted_at IS NULL`,
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

  async listerComptes(campusId: number | null = null): Promise<CompteAdmin[]> {
    return this.db.query<CompteAdmin>(
      `SELECT u.id, u.matricule, u.email, u.nom, u.prenom, u.actif,
              (u.mot_de_passe_hash IS NOT NULL) AS "motDePasseConfigure",
              COALESCE(array_agg(r.role ORDER BY r.role)
                FILTER (WHERE r.role IS NOT NULL), ARRAY[]::varchar[]) AS roles
       FROM identity.users u
       LEFT JOIN identity.user_roles r ON r.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND ($1::int IS NULL OR EXISTS (
         SELECT 1 FROM identity.user_roles perimetre
         WHERE perimetre.user_id = u.id
           AND (perimetre.campus_id = $1 OR perimetre.department_id IN (
             SELECT d.id FROM ref.department d WHERE d.campus_id = $1
           ))
       ))
       GROUP BY u.id
       ORDER BY u.nom, u.prenom, u.id`,
      [campusId],
    );
  }

  async supprimerCompte(
    userId: number,
    actorId: number,
    activeRole: string,
    campusId: number | null,
  ): Promise<void> {
    if (userId === actorId) {
      throw new ConflictException('Vous ne pouvez pas supprimer votre propre compte');
    }

    await this.db.transaction(async (query) => {
      const comptes = await query<{
        id: number;
        email: string | null;
      }>(
        `SELECT id, email
         FROM identity.users
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [userId],
      );
      const compte = comptes[0];
      if (!compte) throw new NotFoundException('Compte introuvable');

      const lignesRoles = await query<{ role: string }>(
        `SELECT role FROM identity.user_roles WHERE user_id = $1 ORDER BY role`,
        [userId],
      );
      const roles = lignesRoles.map((ligne) => ligne.role);

      if (activeRole === 'scolarite') {
        if (campusId === null) {
          throw new ForbiddenException('Campus de la Scolarité introuvable');
        }
        const perimetres = await query<{ autorise: boolean }>(
          `SELECT
             EXISTS (
               SELECT 1 FROM identity.user_roles r
               WHERE r.user_id = $1
                 AND (r.campus_id = $2 OR r.department_id IN (
                   SELECT d.id FROM ref.department d WHERE d.campus_id = $2
                 ))
             )
             AND NOT EXISTS (
               SELECT 1 FROM identity.user_roles r
               WHERE r.user_id = $1
                 AND (
                   r.role NOT IN ('etudiant', 'delegue', 'enseignant')
                   OR NOT COALESCE(
                     r.campus_id = $2 OR r.department_id IN (
                       SELECT d.id FROM ref.department d WHERE d.campus_id = $2
                     ),
                     FALSE
                   )
                 )
             ) AS autorise`,
          [userId, campusId],
        );
        if (!perimetres[0]?.autorise) {
          throw new NotFoundException('Compte introuvable dans votre périmètre');
        }
      } else if (activeRole === 'admin' && roles.includes('admin')) {
        const administrateurs = await query<{ id: number }>(
          `SELECT u.id
           FROM identity.users u
           JOIN identity.user_roles r ON r.user_id = u.id
           WHERE r.role = 'admin' AND u.actif AND u.deleted_at IS NULL
           ORDER BY u.id
           FOR UPDATE OF u`,
        );
        if (administrateurs.length <= 1) {
          throw new ConflictException(
            'Le dernier compte administrateur ne peut pas être supprimé',
          );
        }
      }

      await query(
        `UPDATE identity.users
         SET actif = FALSE,
             deleted_at = NOW(),
             matricule = 'SUPPRIME-' || id::text,
             email = NULL,
             nom = 'Compte supprimé',
             prenom = '',
             mot_de_passe_hash = NULL,
             tentatives_echouees = 0,
             verrouille_jusqua = NULL
         WHERE id = $1 AND deleted_at IS NULL`,
        [userId],
      );
      await query(
        `UPDATE identity.refresh_tokens
         SET revoque_le = COALESCE(revoque_le, NOW())
         WHERE user_id = $1 AND revoque_le IS NULL`,
        [userId],
      );
      await query('DELETE FROM identity.account_tokens WHERE user_id = $1', [
        userId,
      ]);
      await query('DELETE FROM identity.mfa_challenges WHERE user_id = $1', [
        userId,
      ]);
      await query('DELETE FROM identity.mfa_trusted_devices WHERE user_id = $1', [
        userId,
      ]);
      await query('DELETE FROM identity.user_mfa WHERE user_id = $1', [userId]);
      await query('DELETE FROM identity.user_roles WHERE user_id = $1', [userId]);
      await query(
        'DELETE FROM identity.email_change_requests WHERE user_id = $1',
        [userId],
      );
      await query(
        `UPDATE system.email_outbox
         SET failed_at = COALESCE(failed_at, NOW()),
             recipient = '', subject = '', body = ''
         WHERE (event_key = $1 OR recipient = $2)
           AND sent_at IS NULL AND failed_at IS NULL`,
        [`account-activation:${userId}`, comptes[0].email ?? ''],
      );

      await this.audit.enregistrerDans(query, {
        userId: actorId,
        action: 'suppression_compte',
        campusId: activeRole === 'scolarite' ? campusId ?? undefined : undefined,
        objet: `compte:${userId}`,
        detail: `Suppression logique; rôles: ${roles.join(', ') || 'aucun'}`,
      });
    });
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