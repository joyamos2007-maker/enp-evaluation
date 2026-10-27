import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

interface DeliberationExamen {
  id: number;
  course_id: number;
  code: string;
  intitule: string;
  libelle: string;
  bareme: number;
  annee_universitaire: string;
  semestre: number;
  campus: string;
  effectif: number;
  notes_saisies: number;
  deliberee_le: Date | null;
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

  async deliberationsExamens(userId: number, roles: string[]) {
    const campusId = await this.campusScope.forScolarite(userId, roles);
    const rows = await this.db.query<DeliberationExamen>(
      `SELECT a.id, co.id AS course_id, ue.code, ue.intitule, a.libelle,
              a.bareme::float8 AS bareme, co.annee_universitaire, co.semestre,
              campus.nom AS campus, count(DISTINCT e.student_id)::int AS effectif,
              count(DISTINCT n.student_id)
                FILTER (WHERE n.note IS NOT NULL)::int AS notes_saisies,
              d.deliberated_at AS deliberee_le
       FROM academic.assessment_columns a
       JOIN ref.course co ON co.id = a.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN ref.department dep ON dep.id = p.department_id
       JOIN ref.campus campus ON campus.id = dep.campus_id
       LEFT JOIN ref.enrollment e ON e.course_id = co.id
       LEFT JOIN academic.assessment_scores n
         ON n.assessment_id = a.id AND n.student_id = e.student_id
       LEFT JOIN academic.assessment_deliberations d ON d.assessment_id = a.id
       WHERE a.type = 'examen' AND ($1::int IS NULL OR campus.id = $1)
       GROUP BY a.id, co.id, ue.code, ue.intitule, campus.nom, d.deliberated_at
       ORDER BY d.deliberated_at NULLS FIRST, co.annee_universitaire DESC,
                co.semestre DESC, ue.code, a.created_at, a.id`,
      [campusId],
    );
    return rows.map((row) => ({
      id: row.id,
      coursId: row.course_id,
      code: row.code,
      intitule: row.intitule,
      libelle: row.libelle,
      bareme: row.bareme,
      anneeUniversitaire: row.annee_universitaire,
      semestre: row.semestre,
      campus: row.campus,
      effectif: row.effectif,
      notesSaisies: row.notes_saisies,
      delibereeLe: row.deliberee_le,
    }));
  }

  async detailsDeliberationExamen(
    userId: number,
    roles: string[],
    assessmentId: number,
  ) {
    const campusId = await this.campusScope.forScolarite(userId, roles);
    const examens = await this.db.query<DeliberationExamen>(
      `SELECT a.id, co.id AS course_id, ue.code, ue.intitule, a.libelle,
              a.bareme::float8 AS bareme, co.annee_universitaire, co.semestre,
              campus.nom AS campus, count(DISTINCT e.student_id)::int AS effectif,
              count(DISTINCT n.student_id)
                FILTER (WHERE n.note IS NOT NULL)::int AS notes_saisies,
              d.deliberated_at AS deliberee_le
       FROM academic.assessment_columns a
       JOIN ref.course co ON co.id = a.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN ref.department dep ON dep.id = p.department_id
       JOIN ref.campus campus ON campus.id = dep.campus_id
       LEFT JOIN ref.enrollment e ON e.course_id = co.id
       LEFT JOIN academic.assessment_scores n
         ON n.assessment_id = a.id AND n.student_id = e.student_id
       LEFT JOIN academic.assessment_deliberations d ON d.assessment_id = a.id
       WHERE a.id = $1 AND a.type = 'examen'
         AND ($2::int IS NULL OR campus.id = $2)
       GROUP BY a.id, co.id, ue.code, ue.intitule, campus.nom, d.deliberated_at`,
      [assessmentId, campusId],
    );
    const examen = examens[0];
    if (!examen) throw new NotFoundException('Examen introuvable ou hors de votre campus');

    const etudiants = await this.db.query<{
      id: number;
      nom: string;
      prenom: string;
      identifiant: string;
      note: number | null;
    }>(
      `SELECT u.id, u.nom, u.prenom, u.matricule AS identifiant,
              n.note::float8 AS note
       FROM ref.enrollment e
       JOIN identity.users u ON u.id = e.student_id
       LEFT JOIN academic.assessment_scores n
         ON n.assessment_id = $1 AND n.student_id = e.student_id
       WHERE e.course_id = $2
       ORDER BY u.nom, u.prenom, u.id`,
      [assessmentId, examen.course_id],
    );

    return {
      examen: {
        id: examen.id,
        coursId: examen.course_id,
        code: examen.code,
        intitule: examen.intitule,
        libelle: examen.libelle,
        bareme: examen.bareme,
        anneeUniversitaire: examen.annee_universitaire,
        semestre: examen.semestre,
        campus: examen.campus,
        effectif: examen.effectif,
        notesSaisies: examen.notes_saisies,
        delibereeLe: examen.deliberee_le,
      },
      etudiants,
    };
  }

  async delibererExamen(
    userId: number,
    roles: string[],
    assessmentId: number,
  ) {
    const campusId = await this.campusScope.forScolarite(userId, roles);
    const rows = await this.db.query<{ id: number; deliberated_at: Date }>(
      `INSERT INTO academic.assessment_deliberations (assessment_id, deliberated_by)
       SELECT a.id, $2
       FROM academic.assessment_columns a
       JOIN ref.course co ON co.id = a.course_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN ref.department dep ON dep.id = p.department_id
       WHERE a.id = $1 AND a.type = 'examen'
         AND ($3::int IS NULL OR dep.campus_id = $3)
         AND NOT EXISTS (
           SELECT 1 FROM academic.assessment_deliberations d
           WHERE d.assessment_id = a.id
         )
         AND EXISTS (
           SELECT 1 FROM ref.enrollment e WHERE e.course_id = co.id
         )
         AND (SELECT count(*)
              FROM academic.assessment_scores n
              JOIN ref.enrollment e
                ON e.course_id = co.id AND e.student_id = n.student_id
              WHERE n.assessment_id = a.id AND n.note IS NOT NULL)
             = (SELECT count(*) FROM ref.enrollment e WHERE e.course_id = co.id)
       RETURNING assessment_id AS id, deliberated_at`,
      [assessmentId, userId, campusId],
    );
    if (!rows[0]) {
      const examen = await this.detailsDeliberationExamen(userId, roles, assessmentId);
      if (examen.examen.delibereeLe) {
        throw new ConflictException('Cet examen a déjà été délibéré');
      }
      throw new BadRequestException(
        'Toutes les notes doivent être saisies avant de délibérer cet examen',
      );
    }
    return { id: rows[0].id, delibereeLe: rows[0].deliberated_at };
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
