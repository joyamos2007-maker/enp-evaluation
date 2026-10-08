import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DELAI_PREPARATION_SECONDES, SEUIL_ANONYMAT } from '../resultats/resultats.constants';
import { ResultsDatabaseService } from '../resultats/results-database.service';
import {
  formerIdCommentaire,
  type DecisionModeration,
  type RefCommentaire,
  type StatutModeration,
  type TypeCommentaire,
} from './moderation.validation';

export interface CommentaireAModererDto {
  id: string;
  ueCode: string;
  ueIntitule: string;
  type: TypeCommentaire;
  texte: string;
  statut: StatutModeration;
}

interface LigneCommentaire {
  ballot_id: string;
  type: TypeCommentaire;
  texte: string;
  statut: StatutModeration;
  course_id: number;
}

interface LigneUe {
  course_id: number;
  code: string;
  intitule: string;
}

const LIMITE = 500;

// Les commentaires d'une UE sous le seuil ne sont jamais proposes : ils ne seront
// jamais transmis a l'enseignant et sont les plus faciles a rattacher a leur auteur.
const CONDITION_SEUIL = `b.course_id IN (
  SELECT b2.course_id FROM ballot.ballots b2
  WHERE b2.campaign_id = b.campaign_id
  GROUP BY b2.course_id HAVING COUNT(*) >= $3::int)`;

@Injectable()
export class ModerationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly urne: ResultsDatabaseService,
  ) {}

  async lister(campagneId: number, statut?: StatutModeration): Promise<CommentaireAModererDto[]> {
    await this.verifierCampagne(campagneId);
    const lignes = await this.urne.lire<LigneCommentaire>(
      `SELECT cm.ballot_id, cm.type, cm.texte, cm.statut, b.course_id
       FROM ballot.ballot_comments cm
       JOIN ballot.ballots b ON b.id = cm.ballot_id
       JOIN evaluation.campaigns c ON c.id = b.campaign_id
        AND c.statut IN ('close', 'restituee') AND c.urne_melangee_le IS NOT NULL
       WHERE b.campaign_id = $1 AND ($2::text IS NULL OR cm.statut = $2::text)
         AND ${CONDITION_SEUIL}
       ORDER BY gen_random_uuid()
       LIMIT ${LIMITE}`,
      [campagneId, statut ?? null, SEUIL_ANONYMAT],
    );
    return this.enrichir(lignes);
  }

  // La decision et sa trace sont ecrites ensemble par la fonction SQL, qui ne
  // modifie que la colonne statut : le texte du commentaire ne peut pas changer.
  async decider(
    ref: RefCommentaire,
    decision: DecisionModeration,
    userId: number,
  ): Promise<CommentaireAModererDto> {
    const rows = await this.db.query<{ etat: string }>(
      'SELECT evaluation.moderer_commentaire($1::uuid, $2::text, $3::text, $4::int, $5::int) AS etat',
      [ref.ballotId, ref.type, decision, userId, SEUIL_ANONYMAT],
    );
    const etat = rows[0]?.etat;
    if (etat === 'introuvable') throw new NotFoundException('Commentaire introuvable');
    if (etat === 'non_modifiable') {
      throw new ConflictException('La moderation n est possible qu apres la cloture et la preparation de la campagne');
    }
    if (etat === 'statut_invalide') throw new BadRequestException('statut : valide ou masque');
    if (etat !== 'ok' && etat !== 'inchange') throw new ConflictException('Moderation impossible');

    const lignes = await this.urne.lire<LigneCommentaire>(
      `SELECT cm.ballot_id, cm.type, cm.texte, cm.statut, b.course_id
       FROM ballot.ballot_comments cm
       JOIN ballot.ballots b ON b.id = cm.ballot_id
       JOIN evaluation.campaigns c ON c.id = b.campaign_id
        AND c.statut IN ('close', 'restituee') AND c.urne_melangee_le IS NOT NULL
       WHERE cm.ballot_id = $1::uuid AND cm.type = $2::text
         AND ($3::int IS NOT NULL)`,
      [ref.ballotId, ref.type, SEUIL_ANONYMAT],
    );
    const [dto] = await this.enrichir(lignes);
    if (!dto) throw new NotFoundException('Commentaire introuvable');
    return dto;
  }

  private async verifierCampagne(campagneId: number): Promise<void> {
    const campagnes = await this.db.query<{ statut: string }>(
      'SELECT statut FROM evaluation.campaigns WHERE id = $1',
      [campagneId],
    );
    if (!campagnes[0]) throw new NotFoundException('Campagne introuvable');
    if (campagnes[0].statut !== 'close' && campagnes[0].statut !== 'restituee') {
      throw new ConflictException('La moderation n est possible qu apres la cloture de la campagne');
    }
    const etats = await this.db.query<{ etat: string }>(
      'SELECT evaluation.preparer_resultats($1::int, $2::int) AS etat',
      [campagneId, DELAI_PREPARATION_SECONDES],
    );
    const etat = etats[0]?.etat;
    if (etat === 'attente') {
      throw new ConflictException('Les commentaires sont en cours de preparation, reessayez dans quelques minutes');
    }
    if (etat !== 'prete') throw new ConflictException('Moderation indisponible pour cette campagne');
  }

  private async enrichir(lignes: LigneCommentaire[]): Promise<CommentaireAModererDto[]> {
    if (lignes.length === 0) return [];
    const ids = [...new Set(lignes.map((l) => l.course_id))];
    const ues = await this.db.query<LigneUe>(
      `SELECT co.id AS course_id, ue.code, ue.intitule
       FROM ref.course co JOIN ref.ue ue ON ue.id = co.ue_id
       WHERE co.id = ANY($1::int[])`,
      [ids],
    );
    const parId = new Map<number, LigneUe>(ues.map((u): [number, LigneUe] => [u.course_id, u]));
    return lignes.map((l) => {
      const ue = parId.get(l.course_id);
      return {
        id: formerIdCommentaire(l.ballot_id, l.type),
        ueCode: ue?.code ?? '?',
        ueIntitule: ue?.intitule ?? '?',
        type: l.type,
        texte: l.texte,
        statut: l.statut,
      };
    });
  }
}