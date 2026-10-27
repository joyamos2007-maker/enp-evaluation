import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BallotTokenService } from './ballot-token.service';

@Injectable()
export class JetonsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokens: BallotTokenService,
  ) {}

  // Une seule requete atomique : inscription, campagne ouverte, periode et
  // absence de participation anterieure sont verifiees puis enregistrees ensemble.
  // Le jeton est signe AVANT l'insertion mais n'est renvoye qu'apres.
  async emettre(
    userId: number,
    courseId: number,
    campagneId: number,
  ): Promise<{ jeton: string; expireDans: number }> {
    const jeton = this.tokens.signer(campagneId, courseId);

    const rows = await this.db.query<{ ok: number }>(
      `INSERT INTO evaluation.participation_ledger (campaign_id, course_id, student_id)
       SELECT c.id, co.id, $1
       FROM ref.course co
       JOIN ref.program p ON p.id = co.program_id
       JOIN evaluation.campaigns c
         ON c.department_id = p.department_id
        AND c.annee_universitaire = co.annee_universitaire
        AND c.semestre = co.semestre
       WHERE co.id = $2 AND c.id = $3
         AND EXISTS (SELECT 1 FROM ref.enrollment e
                     WHERE e.course_id = co.id AND e.student_id = $1)
         AND c.statut = 'ouverte' AND c.debut <= NOW() AND c.fin > NOW()
       ON CONFLICT DO NOTHING
       RETURNING 1 AS ok`,
      [userId, courseId, campagneId],
    );
    if (rows.length === 0) await this.refuser(userId, courseId, campagneId);
    return jeton;
  }

  private async refuser(userId: number, courseId: number, campagneId: number): Promise<never> {
    const deja = await this.db.query(
      `SELECT 1 FROM evaluation.participation_ledger
       WHERE campaign_id = $1 AND course_id = $2 AND student_id = $3`,
      [campagneId, courseId, userId],
    );
    if (deja.length > 0) {
      throw new ConflictException('Vous avez deja participe a l evaluation de cette UE');
    }
    throw new ForbiddenException(
      'Evaluation indisponible pour cette UE (non inscrit ou campagne fermee)',
    );
  }
}