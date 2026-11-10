import { Injectable } from '@nestjs/common';
import { DatabaseQuery, DatabaseService } from '../database/database.service';

export interface EntreeAudit {
  userId?: number;
  action: string;
  courseId?: number;
  campusId?: number;
  objet?: string;
  detail?: string;
}

interface LigneAudit {
  id: number;
  cree_le: string;
  user_id: number | null;
  user_matricule: string | null;
  action: string;
  campaign_id: number | null;
  course_id: number | null;
  campus_id: number | null;
  objet: string | null;
  detail: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async enregistrer(entree: EntreeAudit): Promise<void> {
    await this.enregistrerDans(this.db.query.bind(this.db), entree);
  }

  async enregistrerDans(
    query: DatabaseQuery,
    entree: EntreeAudit,
  ): Promise<void> {
    await query(
      `INSERT INTO audit.journal
         (user_id, user_matricule, action, course_id, campus_id, objet, detail)
       VALUES (
         $1,
         (SELECT matricule FROM identity.users WHERE id = $1),
         $2, $3, $4, $5, $6
       )`,
      [
        entree.userId ?? null,
        entree.action,
        entree.courseId ?? null,
        entree.campusId ?? null,
        entree.objet ?? null,
        entree.detail ?? null,
      ],
    );
  }

  async lister(limit: number, campusId: number | null = null) {
    const rows = await this.db.query<LigneAudit>(
      `SELECT id,
              to_char(cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cree_le,
              user_id, user_matricule, action, campaign_id, course_id, campus_id, objet, detail
       FROM audit.journal
       WHERE $2::int IS NULL OR (
         campus_id = $2 OR (
           (course_id IS NOT NULL OR campaign_id IS NOT NULL)
           AND (course_id IS NULL OR EXISTS (
             SELECT 1
             FROM ref.course co
             JOIN ref.program p ON p.id = co.program_id
             JOIN ref.department d ON d.id = p.department_id
             WHERE co.id = audit.journal.course_id AND d.campus_id = $2
           ))
           AND (campaign_id IS NULL OR EXISTS (
             SELECT 1
             FROM evaluation.campaigns c
             JOIN ref.department d ON d.id = c.department_id
             WHERE c.id = audit.journal.campaign_id AND d.campus_id = $2
           ))
         )
       )
       ORDER BY cree_le DESC, id DESC
       LIMIT $1`,
      [limit, campusId],
    );
    return rows.map((row) => ({
      id: row.id,
      creeLe: row.cree_le,
      userId: row.user_id ?? undefined,
      userMatricule: row.user_matricule ?? undefined,
      action: row.action,
      campaignId: row.campaign_id ?? undefined,
      courseId: row.course_id ?? undefined,
      objet: row.objet ?? undefined,
      detail: row.detail ?? undefined,
    }));
  }
}
