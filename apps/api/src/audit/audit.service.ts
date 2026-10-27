import { Injectable } from '@nestjs/common';
import { DatabaseQuery, DatabaseService } from '../database/database.service';

export interface EntreeAudit {
  userId?: number;
  action: string;
  courseId?: number;
  objet?: string;
  detail?: string;
}

interface LigneAudit {
  id: number;
  cree_le: string;
  user_id: number | null;
  action: string;
  campaign_id: number | null;
  course_id: number | null;
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
      `INSERT INTO audit.journal (user_id, action, course_id, objet, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entree.userId ?? null,
        entree.action,
        entree.courseId ?? null,
        entree.objet ?? null,
        entree.detail ?? null,
      ],
    );
  }

  async lister(limit: number) {
    const rows = await this.db.query<LigneAudit>(
      `SELECT id,
              to_char(cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cree_le,
              user_id, action, campaign_id, course_id, objet, detail
       FROM audit.journal
       ORDER BY cree_le DESC, id DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => ({
      id: row.id,
      creeLe: row.cree_le,
      userId: row.user_id ?? undefined,
      action: row.action,
      campaignId: row.campaign_id ?? undefined,
      courseId: row.course_id ?? undefined,
      objet: row.objet ?? undefined,
      detail: row.detail ?? undefined,
    }));
  }
}
