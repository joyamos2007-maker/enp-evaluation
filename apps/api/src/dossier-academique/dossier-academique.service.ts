import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import {
  ExportService,
  type FormatExport,
  type ValeurExport,
} from '../exports/export.service';

export type TypeEvaluation = 'devoir' | 'examen';
export type StatutPresence = 'present' | 'absent' | 'retard';

export interface EntreeEvaluation {
  libelle: string;
  type: TypeEvaluation;
  bareme: number;
}

export interface EntreeNote {
  etudiantId: number;
  note: number | null;
}

export interface EntreePresence {
  etudiantId: number;
  statut: StatutPresence;
}

export interface LigneCours {
  id: number;
  code: string;
  intitule: string;
}

@Injectable()
export class DossierAcademiqueService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly exports: ExportService,
  ) {}

  async coursEnseignant(enseignantId: number) {
    return this.db.query<LigneCours>(
      `SELECT co.id, ue.code, ue.intitule
       FROM ref.course_teacher ct
       JOIN ref.course co ON co.id = ct.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       WHERE ct.teacher_id = $1
       ORDER BY ue.code, co.id`,
      [enseignantId],
    );
  }

  async cahierNotes(enseignantId: number, courseId: number) {
    await this.exigerCoursEnseignant(enseignantId, courseId);
    const [cours, etudiants, evaluations, notes] = await Promise.all([
      this.db.query<LigneCours>(
        `SELECT co.id, ue.code, ue.intitule
         FROM ref.course co JOIN ref.ue ue ON ue.id = co.ue_id
         WHERE co.id = $1`,
        [courseId],
      ),
      this.db.query<{
        id: number;
        nom: string;
        prenom: string;
        identifiant: string;
      }>(
        `SELECT u.id, u.nom, u.prenom, u.matricule AS identifiant
         FROM ref.enrollment e
         JOIN identity.users u ON u.id = e.student_id
         WHERE e.course_id = $1
         ORDER BY u.nom, u.prenom, u.id`,
        [courseId],
      ),
      this.db.query<{
        id: number;
        libelle: string;
        type: TypeEvaluation;
        bareme: number;
        created_at: string;
        deliberee: boolean;
      }>(
        `SELECT a.id, a.libelle, a.type, a.bareme::float8 AS bareme,
                a.created_at, (d.assessment_id IS NOT NULL) AS deliberee
         FROM academic.assessment_columns a
         LEFT JOIN academic.assessment_deliberations d ON d.assessment_id = a.id
         WHERE a.course_id = $1
         ORDER BY a.created_at, a.id`,
        [courseId],
      ),
      this.db.query<{
        evaluation_id: number;
        etudiant_id: number;
        note: number | null;
      }>(
        `SELECT n.assessment_id AS evaluation_id, n.student_id AS etudiant_id, n.note::float8 AS note
         FROM academic.assessment_scores n
         JOIN academic.assessment_columns a ON a.id = n.assessment_id
         WHERE a.course_id = $1`,
        [courseId],
      ),
    ]);
    const notesParEvaluation: Record<
      number,
      Record<number, number | null>
    > = {};
    for (const note of notes) {
      (notesParEvaluation[note.evaluation_id] ??= {})[note.etudiant_id] =
        note.note;
    }
    return {
      cours: cours[0],
      etudiants,
      evaluations: evaluations.map((evaluation) => ({
        id: evaluation.id,
        libelle: evaluation.libelle,
        type: evaluation.type,
        bareme: evaluation.bareme,
        creeLe: evaluation.created_at,
        deliberee: evaluation.type === 'devoir' || evaluation.deliberee,
        notes: notesParEvaluation[evaluation.id] ?? {},
      })),
    };
  }

  async exporterNotes(
    enseignantId: number,
    courseId: number,
    format: FormatExport,
  ) {
    const cahier = await this.cahierNotes(enseignantId, courseId);
    const cours = cahier.cours;
    if (!cours)
      throw new NotFoundException(
        'UE introuvable ou non attribuée à cet enseignant',
      );
    const headers = [
      'Matricule',
      'Nom',
      'Prénom',
      ...cahier.evaluations.map(
        (evaluation) => `${evaluation.libelle} (/${evaluation.bareme})`,
      ),
    ];
    const rows: ValeurExport[][] = cahier.etudiants.map((etudiant) => [
      etudiant.identifiant,
      etudiant.nom,
      etudiant.prenom,
      ...cahier.evaluations.map(
        (evaluation) => evaluation.notes[etudiant.id] ?? '—',
      ),
    ]);
    await this.audit.enregistrer({
      userId: enseignantId,
      action: 'notes_export',
      courseId,
      detail: format,
    });
    return this.exports.genererTableau(
      format,
      `${cours.code} — ${cours.intitule}`,
      headers,
      rows,
      'Notes',
    );
  }

  async creerEvaluation(
    enseignantId: number,
    courseId: number,
    entree: EntreeEvaluation,
  ) {
    const rows = await this.db.query<{
      id: number;
      libelle: string;
      type: TypeEvaluation;
      bareme: number;
    }>(
      `INSERT INTO academic.assessment_columns (course_id, created_by, libelle, type, bareme)
       SELECT co.id, $2, $3, $4, $5
       FROM ref.course co
       WHERE co.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = co.id AND ct.teacher_id = $2
       )
       RETURNING id, libelle, type, bareme::float8 AS bareme`,
      [courseId, enseignantId, entree.libelle, entree.type, entree.bareme],
    );
    if (!rows[0])
      throw new NotFoundException(
        'UE introuvable ou non attribuée à cet enseignant',
      );
    return rows[0];
  }

  async enregistrerNotes(
    enseignantId: number,
    evaluationId: number,
    entrees: EntreeNote[],
  ) {
    const evaluations = await this.db.query<{
      course_id: number;
      bareme: number;
      deliberee: boolean;
    }>(
      `SELECT a.course_id, a.bareme::float8 AS bareme,
              (d.assessment_id IS NOT NULL) AS deliberee
       FROM academic.assessment_columns a
       LEFT JOIN academic.assessment_deliberations d ON d.assessment_id = a.id
       WHERE a.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = a.course_id AND ct.teacher_id = $2
       )`,
      [evaluationId, enseignantId],
    );
    const evaluation = evaluations[0];
    if (!evaluation)
      throw new NotFoundException(
        'Évaluation introuvable ou non attribuée à cet enseignant',
      );
    if (evaluation.deliberee) {
      throw new ConflictException(
        'Cette évaluation a été délibérée et ses notes ne peuvent plus être modifiées',
      );
    }
    for (const entree of entrees) {
      if (
        entree.note !== null &&
        (entree.note < 0 || entree.note > evaluation.bareme)
      ) {
        throw new BadRequestException(
          `Chaque note doit être comprise entre 0 et ${evaluation.bareme}`,
        );
      }
    }
    const resultat = await this.db.query<{
      input_count: number;
      saved_count: number;
    }>(
      `WITH entree AS MATERIALIZED (
         SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(etudiant_id INT, note NUMERIC)
       ),
       admissibles AS MATERIALIZED (
         SELECT e.etudiant_id, e.note
         FROM entree e
         JOIN ref.enrollment ins ON ins.student_id = e.etudiant_id
                               AND ins.course_id = $3
         JOIN academic.assessment_columns a ON a.id = $1 AND a.course_id = $3
         WHERE (e.note IS NULL OR e.note <= a.bareme)
           AND NOT EXISTS (
             SELECT 1 FROM academic.assessment_deliberations d
             WHERE d.assessment_id = a.id
           )
           AND EXISTS (
             SELECT 1 FROM ref.course_teacher ct
             WHERE ct.course_id = a.course_id AND ct.teacher_id = $4
           )
       ),
       enregistrees AS (
         INSERT INTO academic.assessment_scores
           (assessment_id, course_id, student_id, note, updated_by)
         SELECT $1, $3, a.etudiant_id, a.note, $4
         FROM admissibles a
         WHERE (SELECT count(*) FROM admissibles) = (SELECT count(*) FROM entree)
         ON CONFLICT (assessment_id, student_id)
         DO UPDATE SET note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING student_id
       )
       SELECT (SELECT count(*)::int FROM entree) AS input_count,
              (SELECT count(*)::int FROM enregistrees) AS saved_count`,
      [
        evaluationId,
        JSON.stringify(entrees),
        evaluation.course_id,
        enseignantId,
      ],
    );
    if (resultat[0]?.input_count !== resultat[0]?.saved_count) {
      const verrou = await this.db.query<{ deliberee: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM academic.assessment_deliberations
           WHERE assessment_id = $1
         ) AS deliberee`,
        [evaluationId],
      );
      if (verrou[0]?.deliberee) {
        throw new ConflictException(
          'Cette évaluation a été délibérée et ses notes ne peuvent plus être modifiées',
        );
      }
      throw new BadRequestException(
        'Un ou plusieurs étudiants ne sont pas inscrits à cette UE',
      );
    }
    return { ok: true, nombreEnregistre: resultat[0].saved_count };
  }

  async seancesPresence(enseignantId: number, courseId: number) {
    await this.exigerCoursEnseignant(enseignantId, courseId);
    return this.db.query<{
      id: number;
      date: string;
      libelle: string;
      effectif: number;
      marques: number;
    }>(
      `SELECT s.id, to_char(s.date, 'YYYY-MM-DD') AS date, s.libelle,
              count(DISTINCT e.student_id)::int AS effectif,
              count(DISTINCT p.student_id)::int AS marques
       FROM academic.attendance_sessions s
       LEFT JOIN ref.enrollment e ON e.course_id = s.course_id
       LEFT JOIN academic.attendance_records p
         ON p.session_id = s.id AND p.student_id = e.student_id
       WHERE s.course_id = $1
       GROUP BY s.id
       ORDER BY s.date DESC, s.id DESC`,
      [courseId],
    );
  }

  async creerSeancePresence(
    enseignantId: number,
    courseId: number,
    date: string,
    libelle: string,
  ) {
    const rows = await this.db.query<{
      id: number;
      date: string;
      libelle: string;
    }>(
      `INSERT INTO academic.attendance_sessions (course_id, created_by, date, libelle)
       SELECT co.id, $2, $3::date, $4
       FROM ref.course co
       WHERE co.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = co.id AND ct.teacher_id = $2
       )
       RETURNING id, to_char(date, 'YYYY-MM-DD') AS date, libelle`,
      [courseId, enseignantId, date, libelle],
    );
    if (!rows[0])
      throw new NotFoundException(
        'UE introuvable ou non attribuée à cet enseignant',
      );
    return rows[0];
  }

  async rosterPresence(enseignantId: number, sessionId: number) {
    const session = await this.db.query<{
      id: number;
      course_id: number;
      date: string;
      libelle: string;
    }>(
      `SELECT s.id, s.course_id, to_char(s.date, 'YYYY-MM-DD') AS date, s.libelle
       FROM academic.attendance_sessions s
       WHERE s.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = s.course_id AND ct.teacher_id = $2
       )`,
      [sessionId, enseignantId],
    );
    if (!session[0])
      throw new NotFoundException(
        'Séance de présence introuvable ou hors de vos UE',
      );
    const etudiants = await this.db.query<{
      id: number;
      nom: string;
      prenom: string;
      identifiant: string;
      statut: StatutPresence | null;
      seances_total: number;
      seances_marquees: number;
      presents: number;
      absents: number;
      retards: number;
    }>(
      `SELECT u.id, u.nom, u.prenom, u.matricule AS identifiant, p.statut,
              count(DISTINCT historique.id)::int AS seances_total,
              count(DISTINCT historique_presence.session_id)::int AS seances_marquees,
              count(DISTINCT historique_presence.session_id)
                FILTER (WHERE historique_presence.statut = 'present')::int AS presents,
              count(DISTINCT historique_presence.session_id)
                FILTER (WHERE historique_presence.statut = 'absent')::int AS absents,
              count(DISTINCT historique_presence.session_id)
                FILTER (WHERE historique_presence.statut = 'retard')::int AS retards
       FROM ref.enrollment e
       JOIN identity.users u ON u.id = e.student_id
       LEFT JOIN academic.attendance_records p
         ON p.session_id = $1 AND p.course_id = e.course_id AND p.student_id = e.student_id
       LEFT JOIN academic.attendance_sessions historique
         ON historique.course_id = e.course_id
       LEFT JOIN academic.attendance_records historique_presence
         ON historique_presence.session_id = historique.id
        AND historique_presence.student_id = e.student_id
       WHERE e.course_id = $2
       GROUP BY u.id, u.nom, u.prenom, u.matricule, p.statut
       ORDER BY u.nom, u.prenom, u.id`,
      [sessionId, session[0].course_id],
    );
    return {
      seance: session[0],
      etudiants: etudiants.map((etudiant) => ({
        id: etudiant.id,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        identifiant: etudiant.identifiant,
        statut: etudiant.statut,
        statistiques: {
          seancesTotal: etudiant.seances_total,
          seancesMarquees: etudiant.seances_marquees,
          presents: etudiant.presents,
          absents: etudiant.absents,
          retards: etudiant.retards,
          tauxPresence:
            etudiant.seances_marquees > 0
              ? Math.round(
                  ((etudiant.presents + etudiant.retards) /
                    etudiant.seances_marquees) *
                    100,
                )
              : null,
        },
      })),
    };
  }

  async enregistrerPresences(
    enseignantId: number,
    sessionId: number,
    entrees: EntreePresence[],
  ) {
    const sessions = await this.db.query<{ course_id: number }>(
      `SELECT s.course_id FROM academic.attendance_sessions s
       WHERE s.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = s.course_id AND ct.teacher_id = $2
       )`,
      [sessionId, enseignantId],
    );
    const session = sessions[0];
    if (!session)
      throw new NotFoundException(
        'Séance de présence introuvable ou hors de vos UE',
      );
    const resultat = await this.db.query<{
      input_count: number;
      saved_count: number;
    }>(
      `WITH entree AS MATERIALIZED (
         SELECT * FROM jsonb_to_recordset($2::jsonb)
           AS x(etudiant_id INT, statut TEXT)
       ),
       admissibles AS MATERIALIZED (
         SELECT e.etudiant_id, e.statut
         FROM entree e
         JOIN ref.enrollment ins ON ins.student_id = e.etudiant_id
                               AND ins.course_id = $3
         JOIN academic.attendance_sessions s ON s.id = $1 AND s.course_id = $3
         WHERE e.statut IN ('present', 'absent', 'retard')
           AND EXISTS (
             SELECT 1 FROM ref.course_teacher ct
             WHERE ct.course_id = s.course_id AND ct.teacher_id = $4
           )
       ),
       enregistrees AS (
         INSERT INTO academic.attendance_records
           (session_id, course_id, student_id, statut, updated_by)
         SELECT $1, $3, a.etudiant_id, a.statut, $4
         FROM admissibles a
         WHERE (SELECT count(*) FROM admissibles) = (SELECT count(*) FROM entree)
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET statut = EXCLUDED.statut, updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING student_id
       )
       SELECT (SELECT count(*)::int FROM entree) AS input_count,
              (SELECT count(*)::int FROM enregistrees) AS saved_count`,
      [sessionId, JSON.stringify(entrees), session.course_id, enseignantId],
    );
    if (resultat[0]?.input_count !== resultat[0]?.saved_count) {
      throw new BadRequestException(
        'Un ou plusieurs statuts sont invalides ou les étudiants ne sont pas inscrits à cette UE',
      );
    }
    return { ok: true, nombreEnregistre: resultat[0].saved_count };
  }

  async notesEtudiant(etudiantId: number) {
    const evaluations = await this.db.query<{
      evaluation_id: number;
      course_id: number;
      code: string;
      intitule: string;
      libelle: string;
      type: TypeEvaluation;
      bareme: number;
      note: number | null;
      deliberee: boolean;
    }>(
      `SELECT a.id AS evaluation_id, co.id AS course_id, ue.code, ue.intitule,
              a.libelle, a.type, a.bareme::float8 AS bareme,
              CASE WHEN a.type = 'devoir' OR d.assessment_id IS NOT NULL
                   THEN n.note::float8 ELSE NULL END AS note,
              (a.type = 'devoir' OR d.assessment_id IS NOT NULL) AS deliberee
       FROM ref.enrollment e
       JOIN ref.course co ON co.id = e.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN academic.assessment_columns a ON a.course_id = co.id
       LEFT JOIN academic.assessment_scores n
         ON n.assessment_id = a.id AND n.student_id = e.student_id
       LEFT JOIN academic.assessment_deliberations d ON d.assessment_id = a.id
       WHERE e.student_id = $1
       ORDER BY ue.code, a.created_at, a.id`,
      [etudiantId],
    );
    return evaluations.map((row) => ({
      evaluationId: row.evaluation_id,
      coursId: row.course_id,
      code: row.code,
      intitule: row.intitule,
      libelle: row.libelle,
      type: row.type,
      bareme: row.bareme,
      note: row.note,
      deliberee: row.deliberee,
    }));
  }

  async presencesEtudiant(etudiantId: number) {
    const [presences, resumes] = await Promise.all([
      this.db.query<{
        seanceId: number;
        coursId: number;
        code: string;
        intitule: string;
        date: string;
        libelle: string;
        statut: StatutPresence;
      }>(
        `SELECT s.id AS "seanceId", co.id AS "coursId", ue.code, ue.intitule,
              to_char(s.date, 'YYYY-MM-DD') AS date, s.libelle, p.statut
       FROM academic.attendance_records p
       JOIN academic.attendance_sessions s ON s.id = p.session_id
       JOIN ref.enrollment e ON e.course_id = p.course_id AND e.student_id = p.student_id
       JOIN ref.course co ON co.id = e.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       WHERE p.student_id = $1
       ORDER BY s.date DESC, s.id DESC`,
        [etudiantId],
      ),
      this.db.query<{
        seances_total: number;
        seances_marquees: number;
        presents: number;
        absents: number;
        retards: number;
      }>(
        `SELECT count(DISTINCT s.id)::int AS seances_total,
                count(DISTINCT p.session_id)::int AS seances_marquees,
                count(DISTINCT p.session_id)
                  FILTER (WHERE p.statut = 'present')::int AS presents,
                count(DISTINCT p.session_id)
                  FILTER (WHERE p.statut = 'absent')::int AS absents,
                count(DISTINCT p.session_id)
                  FILTER (WHERE p.statut = 'retard')::int AS retards
         FROM ref.enrollment e
         JOIN academic.attendance_sessions s ON s.course_id = e.course_id
         LEFT JOIN academic.attendance_records p
           ON p.session_id = s.id AND p.student_id = e.student_id
         WHERE e.student_id = $1`,
        [etudiantId],
      ),
    ]);
    const resume = resumes[0] ?? {
      seances_total: 0,
      seances_marquees: 0,
      presents: 0,
      absents: 0,
      retards: 0,
    };
    return {
      statistiques: {
        seancesTotal: resume.seances_total,
        seancesMarquees: resume.seances_marquees,
        presents: resume.presents,
        absents: resume.absents,
        retards: resume.retards,
        tauxPresence:
          resume.seances_marquees > 0
            ? Math.round(
                ((resume.presents + resume.retards) / resume.seances_marquees) *
                  100,
              )
            : null,
      },
      presences,
    };
  }

  private async exigerCoursEnseignant(enseignantId: number, courseId: number) {
    const rows = await this.db.query<{ id: number }>(
      `SELECT co.id FROM ref.course co
       WHERE co.id = $1 AND EXISTS (
         SELECT 1 FROM ref.course_teacher ct
         WHERE ct.course_id = co.id AND ct.teacher_id = $2
       )`,
      [courseId, enseignantId],
    );
    if (!rows[0])
      throw new NotFoundException(
        'UE introuvable ou non attribuée à cet enseignant',
      );
  }
}
