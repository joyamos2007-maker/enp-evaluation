import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { construireSections, type LigneCritere } from './calcul';
import { DELAI_PREPARATION_SECONDES, SEUIL_ANONYMAT } from './resultats.constants';
import type { ResultatUe, ResultatUeResume } from './resultats.types';
import { ResultsDatabaseService } from './results-database.service';

const ROLES_COMPLETS = ['scolarite', 'admin'];

interface LigneMesUes {
  ue_id: number;
  code: string;
  intitule: string;
  campagne_id: number;
  libelle_campagne: string;
  inscrits: number;
}

interface LigneFiche {
  ue_id: number;
  code: string;
  intitule: string;
  campagne_id: number;
  statut: string;
  inscrits: number;
  enseigne: boolean;
}

// Condition commune : une campagne n'est lisible que close (ou restituee) ET preparee
const CAMPAGNE_LISIBLE = `JOIN evaluation.campaigns c ON c.id = b.campaign_id
   AND c.statut IN ('close', 'restituee') AND c.urne_melangee_le IS NOT NULL`;

@Injectable()
export class ResultatsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly urne: ResultsDatabaseService,
  ) {}

  // Les droits et les referentiels viennent de la base principale ; les chiffres
  // viennent de l'urne, par un role en lecture seule.
  async mesUes(enseignantId: number): Promise<ResultatUeResume[]> {
    const lignes = await this.db.query<LigneMesUes>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule, c.id AS campagne_id,
              c.libelle AS libelle_campagne,
              (SELECT COUNT(*)::int FROM ref.enrollment e WHERE e.course_id = co.id) AS inscrits
       FROM ref.course_teacher ct
       JOIN ref.course co ON co.id = ct.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN evaluation.campaigns c
         ON c.department_id = p.department_id
        AND c.annee_universitaire = co.annee_universitaire
        AND c.semestre = co.semestre
       WHERE ct.teacher_id = $1 AND c.statut IN ('close', 'restituee')
       ORDER BY c.id DESC, ue.code`,
      [enseignantId],
    );
    if (lignes.length === 0) return [];

    // Les campagnes encore dans le delai d'attente n'apparaissent pas encore
    const pretes = new Set<number>();
    for (const id of new Set(lignes.map((l) => l.campagne_id))) {
      if ((await this.preparer(id)) === 'prete') pretes.add(id);
    }
    const retenues = lignes.filter((l) => pretes.has(l.campagne_id));
    if (retenues.length === 0) return [];

    const comptes = await this.urne.lire<{ campagne_id: number; course_id: number; n: number }>(
      `SELECT b.campaign_id AS campagne_id, b.course_id, COUNT(*)::int AS n
       FROM ballot.ballots b
       ${CAMPAGNE_LISIBLE}
       WHERE (b.campaign_id, b.course_id) IN (SELECT * FROM unnest($1::int[], $2::int[]))
       GROUP BY b.campaign_id, b.course_id`,
      [retenues.map((l) => l.campagne_id), retenues.map((l) => l.ue_id)],
    );
    const nombres = new Map<string, number>();
    for (const c of comptes) nombres.set(c.campagne_id + ':' + c.course_id, c.n);

    return retenues.map((l) => {
      const repondants = nombres.get(l.campagne_id + ':' + l.ue_id) ?? 0;
      return {
        ueId: l.ue_id,
        code: l.code,
        intitule: l.intitule,
        campagneId: l.campagne_id,
        libelleCampagne: l.libelle_campagne,
        inscrits: l.inscrits,
        repondants,
        detailDisponible: repondants >= SEUIL_ANONYMAT,
      };
    });
  }

  async fiche(
    utilisateur: { id: number; roles: string[] },
    courseId: number,
    campagneId: number,
  ): Promise<ResultatUe> {
    const lignes = await this.db.query<LigneFiche>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule, c.id AS campagne_id, c.statut,
              (SELECT COUNT(*)::int FROM ref.enrollment e WHERE e.course_id = co.id) AS inscrits,
              EXISTS (SELECT 1 FROM ref.course_teacher ct
                      WHERE ct.course_id = co.id AND ct.teacher_id = $3) AS enseigne
       FROM ref.course co
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN evaluation.campaigns c
         ON c.department_id = p.department_id
        AND c.annee_universitaire = co.annee_universitaire
        AND c.semestre = co.semestre
       WHERE co.id = $1 AND c.id = $2`,
      [courseId, campagneId, utilisateur.id],
    );
    const l = lignes[0];
    if (!l) throw new NotFoundException('UE ou campagne introuvable');

    const accesComplet = utilisateur.roles.some((r) => ROLES_COMPLETS.includes(r));
    if (!accesComplet && !l.enseigne) {
      throw new ForbiddenException('Acces refuse : cette UE n est pas la votre');
    }
    if (l.statut !== 'close' && l.statut !== 'restituee') {
      throw new ConflictException('Les resultats ne sont disponibles qu apres la cloture de la campagne');
    }
    const etat = await this.preparer(campagneId);
    if (etat !== 'prete') {
      throw new ConflictException(
        etat === 'attente'
          ? 'Les resultats sont en cours de preparation, reessayez dans quelques minutes'
          : 'Les resultats ne sont pas disponibles pour cette campagne',
      );
    }

    const base = {
      ueId: l.ue_id,
      code: l.code,
      intitule: l.intitule,
      campagneId: l.campagne_id,
      inscrits: l.inscrits,
      seuil: SEUIL_ANONYMAT,
    };

    const compte = await this.urne.lire<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM ballot.ballots b
       ${CAMPAGNE_LISIBLE}
       WHERE b.campaign_id = $1 AND b.course_id = $2`,
      [campagneId, courseId],
    );
    const repondants = compte[0]?.n ?? 0;

    // Sous le seuil : aucune agregation n'est meme calculee
    if (repondants < SEUIL_ANONYMAT) {
      return {
        ...base,
        repondants,
        detailDisponible: false,
        sections: [],
        pointsForts: [],
        pointsAAmeliorer: [],
      };
    }

    const criteres = await this.urne.lire<LigneCritere>(
      `SELECT s.code AS section_code, s.titre AS section_titre,
              cr.id AS critere_id, cr.code AS critere_code, cr.libelle,
              COUNT(*) FILTER (WHERE a.valeur = 1)::int AS n1,
              COUNT(*) FILTER (WHERE a.valeur = 2)::int AS n2,
              COUNT(*) FILTER (WHERE a.valeur = 3)::int AS n3,
              COUNT(*) FILTER (WHERE a.valeur = 4)::int AS n4,
              COUNT(*) FILTER (WHERE a.valeur = 5)::int AS n5,
              COUNT(*) FILTER (WHERE a.valeur IS NULL)::int AS sans_avis
       FROM ballot.ballots b
       ${CAMPAGNE_LISIBLE}
       JOIN ballot.ballot_answers a ON a.ballot_id = b.id
       JOIN evaluation.criteria cr ON cr.id = a.criterion_id
       JOIN evaluation.sections s ON s.id = cr.section_id
       WHERE b.campaign_id = $1 AND b.course_id = $2
       GROUP BY s.ordre, s.code, s.titre, cr.ordre, cr.id, cr.code, cr.libelle
       ORDER BY s.ordre, cr.ordre`,
      [campagneId, courseId],
    );

    // Seuls les commentaires valides sont transmis, dans un ordre aleatoire
    const commentaires = await this.urne.lire<{ type: string; texte: string }>(
      `SELECT cm.type, cm.texte
       FROM ballot.ballot_comments cm
       JOIN ballot.ballots b ON b.id = cm.ballot_id
       ${CAMPAGNE_LISIBLE}
       WHERE b.campaign_id = $1 AND b.course_id = $2 AND cm.statut = 'valide'
       ORDER BY gen_random_uuid()`,
      [campagneId, courseId],
    );

    return {
      ...base,
      repondants,
      detailDisponible: true,
      sections: construireSections(criteres),
      pointsForts: commentaires.filter((c) => c.type === 'points_forts').map((c) => c.texte),
      pointsAAmeliorer: commentaires
        .filter((c) => c.type === 'points_a_ameliorer')
        .map((c) => c.texte),
    };
  }

  private async preparer(campagneId: number): Promise<string> {
    const rows = await this.db.query<{ etat: string }>(
      'SELECT evaluation.preparer_resultats($1::int, $2::int) AS etat',
      [campagneId, DELAI_PREPARATION_SECONDES],
    );
    return rows[0]?.etat ?? 'inconnue';
  }
}