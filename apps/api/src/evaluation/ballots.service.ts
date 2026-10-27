import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BallotDatabaseService } from './ballot-database.service';
import { BallotTokenService } from './ballot-token.service';
import type { BulletinEntree } from './ballots.validation';

function codePg(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}

@Injectable()
export class BallotsService {
  constructor(
    private readonly db: BallotDatabaseService,
    private readonly tokens: BallotTokenService,
  ) {}

  // Aucun identifiant d'etudiant n'existe ici : seul le jeton de vote est connu.
  // Le jeton est consomme et le bulletin ecrit dans UNE transaction.
  async deposer(entree: BulletinEntree): Promise<void> {
    const jeton = this.tokens.verifier(entree.jeton);
    if (!jeton) throw new GoneException('Jeton de vote invalide ou expire');

    try {
      await this.db.transaction(async (tx) => {
        const campagnes = await tx.lire<{ version_id: number }>(
          `SELECT version_id FROM evaluation.campaigns
           WHERE id = $1 AND statut = 'ouverte' AND debut <= NOW() AND fin > NOW()`,
          [jeton.campagneId],
        );
        if (campagnes.length === 0) {
          throw new ForbiddenException('Campagne fermee : depot impossible');
        }
        const versionId = campagnes[0].version_id;

        const criteres = await tx.lire<{ id: number }>(
          `SELECT cr.id FROM evaluation.criteria cr
           JOIN evaluation.sections s ON s.id = cr.section_id
           WHERE s.version_id = $1`,
          [versionId],
        );
        const attendus = new Set(criteres.map((c) => c.id));
        const recus = entree.reponses.map((r) => r.critereId);
        // Doublons deja refuses par la validation : meme nombre + tous connus = correspondance exacte
        if (recus.length !== attendus.size || recus.some((id) => !attendus.has(id))) {
          throw new BadRequestException('Reponses incompletes ou critere inconnu');
        }

        const consomme = await tx.executer(
          `INSERT INTO ballot.used_tokens (jti, expire_le)
           VALUES ($1::uuid, to_timestamp($2::double precision))
           ON CONFLICT DO NOTHING`,
          [jeton.jti, jeton.exp],
        );
        if (consomme.lignes === 0) throw new ConflictException('Ce jeton a deja ete utilise');

        const ballotId = randomUUID();
        await tx.executer(
          `INSERT INTO ballot.ballots (id, campaign_id, course_id, version_id)
           VALUES ($1::uuid, $2, $3, $4)`,
          [ballotId, jeton.campagneId, jeton.courseId, versionId],
        );
        await tx.executer(
          `INSERT INTO ballot.ballot_answers (ballot_id, criterion_id, valeur)
           SELECT $1::uuid, t.c, t.v FROM unnest($2::int[], $3::smallint[]) AS t(c, v)`,
          [ballotId, recus, entree.reponses.map((r) => r.valeur)],
        );
        if (entree.pointsForts) {
          await tx.executer(
            `INSERT INTO ballot.ballot_comments (ballot_id, type, texte)
             VALUES ($1::uuid, 'points_forts', $2)`,
            [ballotId, entree.pointsForts],
          );
        }
        if (entree.pointsAAmeliorer) {
          await tx.executer(
            `INSERT INTO ballot.ballot_comments (ballot_id, type, texte)
             VALUES ($1::uuid, 'points_a_ameliorer', $2)`,
            [ballotId, entree.pointsAAmeliorer],
          );
        }
      });
    } catch (err) {
      if (codePg(err) === '23503') throw new BadRequestException('Bulletin invalide');
      throw err;
    }
  }
}