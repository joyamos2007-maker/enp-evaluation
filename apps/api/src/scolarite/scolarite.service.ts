import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CampusScopeService } from '../database/campus-scope.service';
import { ResultsDatabaseService } from '../resultats/results-database.service';
import { SEUIL_ANONYMAT } from '../resultats/resultats.constants';

interface CampagneLigne {
  id: number;
  libelle: string;
  department_id: number;
  departement: string;
  annee_universitaire: string;
  semestre: number;
  version_id: number;
  debut: Date;
  fin: Date;
  statut: string;
}

interface Compteur {
  nombre: number;
}

interface StatistiquesParticipation {
  inscriptions: number;
  participations: number;
}

export interface CampagneScolarite {
  id: number;
  libelle: string;
  departmentId: number;
  departement: string;
  anneeUniversitaire: string;
  semestre: number;
  versionId: number;
  debut: Date;
  fin: Date;
  statut: string;
}

const CAMPAGNES = `
  SELECT c.id, c.libelle, c.department_id, d.nom AS departement,
         c.annee_universitaire, c.semestre, c.version_id, c.debut, c.fin, c.statut
  FROM evaluation.campaigns c
  JOIN ref.department d ON d.id = c.department_id`;

const CAMPAGNES_AVEC_COURS = `
  SELECT c.id AS campaign_id, co.id AS course_id
  FROM evaluation.campaigns c
  JOIN ref.department d ON d.id = c.department_id
  JOIN ref.program p ON p.department_id = c.department_id
  JOIN ref.course co ON co.program_id = p.id
    AND co.annee_universitaire = c.annee_universitaire
    AND co.semestre = c.semestre
  WHERE ($1::int IS NULL OR d.campus_id = $1)`;

@Injectable()
export class ScolariteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly resultsDb: ResultsDatabaseService,
    private readonly campusScope: CampusScopeService,
  ) {}

  async departements(
    userId: number,
    roles: string[],
  ): Promise<{ id: number; nom: string; campus: string }[]> {
    const campusId = await this.campusScope.forScolarite(userId, roles);
    return this.db.query<{ id: number; nom: string; campus: string }>(
      `SELECT d.id, d.nom, c.nom AS campus
       FROM ref.department d
       JOIN ref.campus c ON c.id = d.campus_id
       WHERE ($1::int IS NULL OR c.id = $1)
       ORDER BY c.nom, d.nom`,
      [campusId],
    );
  }

  async tableauDeBord(userId: number, roles: string[]) {
    const campusId = await this.campusScope.forScolarite(userId, roles);
    const [campagnes, comptesSansMotDePasse, participation] = await Promise.all([
      this.db.query<CampagneLigne>(
        CAMPAGNES + ' WHERE ($1::int IS NULL OR d.campus_id = $1) ORDER BY c.id DESC',
        [campusId],
      ),
      this.db.query<Compteur>(
        `SELECT COUNT(*)::int AS nombre
         FROM identity.users u
         WHERE u.actif = TRUE AND u.mot_de_passe_hash IS NULL
           AND ($1::int IS NULL OR EXISTS (
             SELECT 1 FROM identity.user_roles r
             WHERE r.user_id = u.id
               AND (r.campus_id = $1 OR r.department_id IN (
                 SELECT d.id FROM ref.department d WHERE d.campus_id = $1
               ))
           ))`,
        [campusId],
      ),
      this.db.query<StatistiquesParticipation>(
        `WITH campagne_courses AS (${CAMPAGNES_AVEC_COURS})
         SELECT
           (SELECT COUNT(*)::int
            FROM campagne_courses cc
            JOIN ref.enrollment e ON e.course_id = cc.course_id) AS inscriptions,
           (SELECT COUNT(*)::int
            FROM campagne_courses cc
            JOIN evaluation.participation_ledger pl
              ON pl.campaign_id = cc.campaign_id AND pl.course_id = cc.course_id) AS participations`,
        [campusId],
      ),
    ]);
    const idsCampagnes = campagnes.map((c) => c.id);
    let bulletins = 0;
    let commentairesAModerer = 0;
    if (idsCampagnes.length > 0) {
      const lignesCompteurs = await this.resultsDb.lire<{
        bulletins: number;
        commentaires: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM ballot.ballots
            WHERE campaign_id = ANY($1::int[])) AS bulletins,
           (SELECT COUNT(*)::int
            FROM ballot.ballot_comments cm
            JOIN ballot.ballots b ON b.id = cm.ballot_id
            JOIN evaluation.campaigns c ON c.id = b.campaign_id
            WHERE b.campaign_id = ANY($1::int[])
              AND cm.statut = 'a_moderer'
              AND c.statut IN ('close', 'restituee')
              AND c.urne_melangee_le IS NOT NULL
              AND b.course_id IN (
                SELECT b2.course_id
                FROM ballot.ballots b2
                WHERE b2.campaign_id = b.campaign_id
                GROUP BY b2.course_id
                HAVING COUNT(*) >= $2::int
              )) AS commentaires`,
        [idsCampagnes, SEUIL_ANONYMAT],
      );
      const compteurs = lignesCompteurs[0];
      bulletins = compteurs?.bulletins ?? 0;
      commentairesAModerer = compteurs?.commentaires ?? 0;
    }

    return {
      campagnesOuvertes: campagnes.filter((c) => c.statut === 'ouverte').length,
      comptesSansMotDePasse: comptesSansMotDePasse[0]?.nombre ?? 0,
      commentairesAModerer,
      participation: {
        inscriptions: participation[0]?.inscriptions ?? 0,
        participations: participation[0]?.participations ?? 0,
        bulletins,
      },
      campagnes: campagnes.map((c) => ({
        id: c.id,
        libelle: c.libelle,
        departmentId: c.department_id,
        departement: c.departement,
        anneeUniversitaire: c.annee_universitaire,
        semestre: c.semestre,
        versionId: c.version_id,
        debut: c.debut,
        fin: c.fin,
        statut: c.statut,
      })),
    };
  }
}
