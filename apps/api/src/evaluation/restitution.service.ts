import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CampagnesService, type CampagneDto } from './campagnes.service';
import type { RestitutionEntree } from './restitution.validation';

export interface RestitutionDto {
  campagneId: number;
  libelle: string;
  departement: string;
  anneeUniversitaire: string;
  semestre: number;
  resultats: string;
  suites: string;
  publieLe: Date;
}

interface LigneRestitution {
  campagne_id: number;
  libelle: string;
  departement: string;
  annee_universitaire: string;
  semestre: number;
  resultats: string;
  suites: string;
  publie_le: Date;
}

@Injectable()
export class RestitutionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly campagnes: CampagnesService,
  ) {}

  // Une seule requete : changement de statut, enregistrement des textes et trace
  // d'audit sont inseparables. Deux publications simultanees : une seule reussit.
  async publier(campagneId: number, userId: number, entree: RestitutionEntree): Promise<CampagneDto> {
    const rows = await this.db.query<{ id: number }>(
      `WITH maj AS (
         UPDATE evaluation.campaigns SET statut = 'restituee'
         WHERE id = $1::int AND statut = 'close'
         RETURNING id),
       publication AS (
         INSERT INTO evaluation.restitutions (campaign_id, resultats, suites, publie_par)
         SELECT id, $2::text, $3::text, $4::int FROM maj
         RETURNING campaign_id),
       trace AS (
         INSERT INTO audit.journal (user_id, action, campaign_id, detail)
         SELECT $4::int, 'restitution', id, 'close -> restituee' FROM maj
         RETURNING id)
       SELECT id FROM maj`,
      [campagneId, entree.resultats, entree.suites, userId],
    );
    if (rows.length === 0) await this.expliquerRefus(campagneId);
    return this.campagnes.trouver(campagneId);
  }

  // Restitutions des campagnes qui concernent l'etudiant (selon ses inscriptions).
  // Aucune lecture du registre de participation ni de l'urne.
  async pourEtudiant(userId: number): Promise<RestitutionDto[]> {
    const rows = await this.db.query<LigneRestitution>(
      `SELECT DISTINCT c.id AS campagne_id, c.libelle, d.nom AS departement,
              c.annee_universitaire, c.semestre, r.resultats, r.suites, r.publie_le
       FROM ref.enrollment e
       JOIN ref.course co ON co.id = e.course_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN evaluation.campaigns c
         ON c.department_id = p.department_id
        AND c.annee_universitaire = co.annee_universitaire
        AND c.semestre = co.semestre
       JOIN ref.department d ON d.id = c.department_id
       JOIN evaluation.restitutions r ON r.campaign_id = c.id
       WHERE e.student_id = $1 AND c.statut = 'restituee'
       ORDER BY r.publie_le DESC, c.id DESC`,
      [userId],
    );
    return rows.map((r) => ({
      campagneId: r.campagne_id,
      libelle: r.libelle,
      departement: r.departement,
      anneeUniversitaire: r.annee_universitaire,
      semestre: r.semestre,
      resultats: r.resultats,
      suites: r.suites,
      publieLe: r.publie_le,
    }));
  }

  private async expliquerRefus(campagneId: number): Promise<never> {
    const campagne = await this.campagnes.trouver(campagneId); // 404 si absente
    if (campagne.statut === 'restituee') {
      throw new ConflictException('Cette campagne a deja ete restituee');
    }
    throw new ConflictException('La restitution n est possible que pour une campagne close');
  }
}