import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SEUIL_ANONYMAT } from '../resultats/resultats.constants';
import { DatabaseService } from '../database/database.service';
import { ResultsDatabaseService } from '../resultats/results-database.service';

export interface SuitesEntree {
  meilleuresUe: string;
  ueAttention: string;
  actions: string;
  etabliPar: string;
  date: string;
  visaChef: boolean;
}

interface LigneCours {
  ue_id: number;
  code: string;
  intitule: string;
  enseignant: string;
  inscrits: number;
}

interface LigneBallots {
  course_id: number;
  repondants: number;
  moy_a: number | null;
  moy_b: number | null;
  moy_c: number | null;
  moy_d: number | null;
  satisfaction_e: number | null;
}

const REQUETE_STATS_BULLETINS = `SELECT b.course_id, COUNT(DISTINCT b.id)::int AS repondants,
       AVG(a.valeur) FILTER (WHERE s.code = 'A')::float AS moy_a,
       AVG(a.valeur) FILTER (WHERE s.code = 'B')::float AS moy_b,
       AVG(a.valeur) FILTER (WHERE s.code = 'C')::float AS moy_c,
       AVG(a.valeur) FILTER (WHERE s.code = 'D')::float AS moy_d,
       AVG(a.valeur) FILTER (WHERE s.code = 'E')::float AS satisfaction_e
FROM ballot.ballots b
JOIN evaluation.campaigns campagne ON campagne.id = b.campaign_id
  AND campagne.statut IN ('close', 'restituee')
  AND campagne.urne_melangee_le IS NOT NULL
JOIN ballot.ballot_answers a ON a.ballot_id = b.id
JOIN evaluation.criteria critere ON critere.id = a.criterion_id
JOIN evaluation.sections s ON s.id = critere.section_id
WHERE b.campaign_id = $1 AND b.course_id = ANY($2::int[])
GROUP BY b.course_id`;

@Injectable()
export class PilotageService {
  constructor(
    private readonly db: DatabaseService,
    private readonly resultsDb: ResultsDatabaseService,
  ) {}

  async campagnes(departmentId: number) {
    return this.db.query(
      `SELECT c.id, c.libelle, c.semestre::text AS semestre,
              c.annee_universitaire AS "anneeUniversitaire",
              c.debut, c.fin, c.statut
       FROM evaluation.campaigns c
       WHERE c.department_id = $1
       ORDER BY c.annee_universitaire DESC, c.semestre DESC, c.id DESC`,
      [departmentId],
    );
  }

  async participation(campagneId: number, departmentId: number) {
    const campagne = await this.trouverCampagne(campagneId, departmentId);
    const cours = await this.db.query<LigneCours>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule, ''::text AS enseignant,
              COUNT(DISTINCT e.student_id)::int AS inscrits
       FROM ref.course co
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       LEFT JOIN ref.enrollment e ON e.course_id = co.id
       WHERE p.department_id = $1
         AND co.annee_universitaire = $2
         AND co.semestre = $3
       GROUP BY co.id, ue.code, ue.intitule
       ORDER BY ue.code`,
      [departmentId, campagne.annee_universitaire, campagne.semestre],
    );
    if (cours.length === 0) return [];

    const bullets = await this.resultsDb.lire<{ course_id: number; n: number }>(
      `SELECT b.course_id, COUNT(*)::int AS n
       FROM ballot.ballots b
       WHERE b.campaign_id = $1 AND b.course_id = ANY($2::int[])
       GROUP BY b.course_id`,
      [campagneId, cours.map((ligne) => ligne.ue_id)],
    );
    const nombres = new Map(bullets.map((ligne) => [ligne.course_id, ligne.n]));
    return cours.map((ligne) => ({
      ueId: ligne.ue_id,
      code: ligne.code,
      intitule: ligne.intitule,
      inscrits: ligne.inscrits,
      repondants: nombres.get(ligne.ue_id) ?? 0,
    }));
  }

  async synthese(campagneId: number, departmentId: number) {
    const campagne = await this.trouverCampagne(campagneId, departmentId);
    const entete = await this.db.query<{ campus: string; departement: string }>(
      `SELECT campus.nom AS campus, d.nom AS departement
       FROM ref.department d
       JOIN ref.campus campus ON campus.id = d.campus_id
       WHERE d.id = $1`,
      [departmentId],
    );
    if (!entete[0]) throw new NotFoundException('Département introuvable');

    const cours = await this.db.query<LigneCours>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule,
              COALESCE(string_agg(DISTINCT NULLIF(BTRIM(CONCAT_WS(' ', u.prenom, u.nom)), ''), ', '),
                       'Non renseigné') AS enseignant,
              COUNT(DISTINCT e.student_id)::int AS inscrits
       FROM ref.course co
       JOIN ref.ue ue ON ue.id = co.ue_id
       LEFT JOIN ref.course_teacher ct ON ct.course_id = co.id
       LEFT JOIN identity.users u ON u.id = ct.teacher_id
       LEFT JOIN ref.enrollment e ON e.course_id = co.id
       WHERE co.program_id IN (SELECT id FROM ref.program WHERE department_id = $1)
         AND co.annee_universitaire = $2 AND co.semestre = $3
       GROUP BY co.id, ue.code, ue.intitule
       ORDER BY ue.code`,
      [departmentId, campagne.annee_universitaire, campagne.semestre],
    );

    const bulletins = campagne.statut === 'close' || campagne.statut === 'restituee'
      ? await this.resultsDb.lire<LigneBallots>(
          REQUETE_STATS_BULLETINS,
          [campagneId, cours.map((ligne) => ligne.ue_id)],
        )
      : [];
    const parCours = new Map(bulletins.map((ligne) => [ligne.course_id, ligne]));
    const lignes = cours.map((ligne) => {
      const resultat = parCours.get(ligne.ue_id);
      const detailDisponible = (resultat?.repondants ?? 0) >= SEUIL_ANONYMAT;
      return {
        ueId: ligne.ue_id,
        code: ligne.code,
        intitule: ligne.intitule,
        enseignant: ligne.enseignant,
        nbReponses: resultat?.repondants ?? 0,
        moyA: detailDisponible ? resultat?.moy_a ?? null : null,
        moyB: detailDisponible ? resultat?.moy_b ?? null : null,
        moyC: detailDisponible ? resultat?.moy_c ?? null : null,
        moyD: detailDisponible ? resultat?.moy_d ?? null : null,
        satisfactionE: detailDisponible ? resultat?.satisfaction_e ?? null : null,
        detailDisponible,
      };
    });

    return {
      campagne: {
        id: campagne.id,
        libelle: campagne.libelle,
        semestre: String(campagne.semestre),
        anneeUniversitaire: campagne.annee_universitaire,
        debut: campagne.debut,
        fin: campagne.fin,
        statut: campagne.statut,
      },
      ...entete[0],
      totalRepondants: lignes.reduce((total, ligne) => total + ligne.nbReponses, 0),
      lignes,
    };
  }

  async enregistrerSuites(
    campagneId: number,
    departmentId: number,
    userId: number,
    entree: unknown,
  ) {
    const suites = this.validerSuites(entree);
    const lignes = await this.db.query(
      `INSERT INTO academic.department_campaign_reviews
         (campaign_id, department_id, meilleures_ue, ue_attention, actions,
          etabli_par, date_revue, visa_chef, updated_by)
       SELECT c.id, c.department_id, $3, $4, $5, $6, $7::date, $8, $9
       FROM evaluation.campaigns c
       WHERE c.id = $1 AND c.department_id = $2
       ON CONFLICT (campaign_id) DO UPDATE SET
         meilleures_ue = EXCLUDED.meilleures_ue,
         ue_attention = EXCLUDED.ue_attention,
         actions = EXCLUDED.actions,
         etabli_par = EXCLUDED.etabli_par,
         date_revue = EXCLUDED.date_revue,
         visa_chef = EXCLUDED.visa_chef,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       WHERE academic.department_campaign_reviews.department_id = EXCLUDED.department_id
       RETURNING campaign_id`,
      [
        campagneId,
        departmentId,
        suites.meilleuresUe,
        suites.ueAttention,
        suites.actions,
        suites.etabliPar,
        suites.date,
        suites.visaChef,
        userId,
      ],
    );
    if (lignes.length === 0) {
      throw new NotFoundException('Campagne introuvable pour votre département');
    }
    return suites;
  }

  async lireSuites(campagneId: number, departmentId: number): Promise<SuitesEntree> {
    const lignes = await this.db.query<{
      meilleures_ue: string | null;
      ue_attention: string | null;
      actions: string | null;
      etabli_par: string | null;
      date: string | null;
      visa_chef: boolean | null;
    }>(
      `SELECT r.meilleures_ue, r.ue_attention, r.actions, r.etabli_par,
              r.date_revue::text AS date, r.visa_chef
       FROM evaluation.campaigns c
       LEFT JOIN academic.department_campaign_reviews r
         ON r.campaign_id = c.id AND r.department_id = c.department_id
       WHERE c.id = $1 AND c.department_id = $2`,
      [campagneId, departmentId],
    );
    if (!lignes[0]) throw new NotFoundException('Campagne introuvable pour votre département');
    const ligne = lignes[0];
    return {
      meilleuresUe: ligne.meilleures_ue ?? '',
      ueAttention: ligne.ue_attention ?? '',
      actions: ligne.actions ?? '',
      etabliPar: ligne.etabli_par ?? '',
      date: ligne.date ?? new Date().toISOString().slice(0, 10),
      visaChef: ligne.visa_chef ?? false,
    };
  }

  private async trouverCampagne(campagneId: number, departmentId: number) {
    const lignes = await this.db.query<{
      id: number;
      libelle: string;
      annee_universitaire: string;
      semestre: number;
      statut: string;
      debut: Date;
      fin: Date;
    }>(
      `SELECT id, libelle, annee_universitaire, semestre, statut, debut, fin
       FROM evaluation.campaigns WHERE id = $1 AND department_id = $2`,
      [campagneId, departmentId],
    );
    if (!lignes[0]) throw new NotFoundException('Campagne introuvable pour votre département');
    return lignes[0];
  }

  private validerSuites(valeur: unknown): SuitesEntree {
    if (typeof valeur !== 'object' || valeur === null) {
      throw new BadRequestException('Les suites de campagne sont invalides');
    }
    const corps = valeur as Record<string, unknown>;
    const texte = (cle: keyof Omit<SuitesEntree, 'date' | 'visaChef'>, max: number) => {
      const contenu = corps[cle];
      if (typeof contenu !== 'string' || contenu.length > max) {
        throw new BadRequestException(`Le champ ${cle} doit être un texte de ${max} caractères maximum`);
      }
      return contenu.trim();
    };
    const date = corps.date;
    const visaChef = corps.visaChef;
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      typeof visaChef !== 'boolean'
    ) {
      throw new BadRequestException('La date et le visa du Chef sont obligatoires et doivent être valides');
    }
    return {
      meilleuresUe: texte('meilleuresUe', 3000),
      ueAttention: texte('ueAttention', 3000),
      actions: texte('actions', 3000),
      etabliPar: texte('etabliPar', 200),
      date,
      visaChef,
    };
  }
}
