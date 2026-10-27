import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseQuery, DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

const ANNEE = /^\d{4}-\d{4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateValide(value: string): boolean {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

@Injectable()
export class AcademicManagementService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listerEnseignants(courseId: number, campusId: number | null) {
    await this.verifierCours(courseId, campusId);
    return this.db.query(
      `SELECT u.id, u.matricule, u.nom, u.prenom
       FROM ref.course_teacher ct
       JOIN identity.users u ON u.id = ct.teacher_id
       WHERE ct.course_id = $1
       ORDER BY u.nom, u.prenom, u.id`,
      [courseId],
    );
  }

  async ajouterEnseignant(
    courseId: number,
    userId: number,
    campusId: number | null,
    actorId: number,
  ) {
    await this.db.transaction(async (query) => {
      const rows = await query<{ teacher_id: number }>(
        `INSERT INTO ref.course_teacher (course_id, teacher_id)
       SELECT c.id, u.id
       FROM ref.course c
       JOIN ref.program p ON p.id = c.program_id
       JOIN ref.department d ON d.id = p.department_id
       JOIN identity.users u ON u.id = $2 AND u.actif
       JOIN identity.user_roles r ON r.user_id = u.id AND r.role = 'enseignant'
       WHERE c.id = $1 AND ($3::int IS NULL OR d.campus_id = $3)
         AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)
         AND NOT EXISTS (
           SELECT 1 FROM academic.annual_archives a
           WHERE a.annee_universitaire = c.annee_universitaire
         )
       ON CONFLICT (course_id, teacher_id) DO UPDATE
       SET teacher_id = EXCLUDED.teacher_id
       RETURNING teacher_id`,
        [courseId, userId, campusId],
      );
      if (!rows.length) {
        throw new BadRequestException(
          'Enseignant ou cours invalide, hors périmètre ou archivé',
        );
      }
      await this.audit.enregistrerDans(query, {
        userId: actorId,
        action: 'affectation_enseignant_ajout',
        courseId,
        objet: `enseignant:${userId}`,
      });
    });
    return { ok: true };
  }

  async retirerEnseignant(
    courseId: number,
    userId: number,
    campusId: number | null,
    actorId: number,
  ) {
    await this.db.transaction(async (query) => {
      const rows = await query<{ teacher_id: number }>(
        `DELETE FROM ref.course_teacher ct
       USING ref.course c, ref.program p, ref.department d
       WHERE ct.course_id = c.id AND ct.teacher_id = $2
         AND c.id = $1 AND p.id = c.program_id AND d.id = p.department_id
         AND ($3::int IS NULL OR d.campus_id = $3)
         AND NOT EXISTS (
           SELECT 1 FROM academic.annual_archives a
           WHERE a.annee_universitaire = c.annee_universitaire
         )
       RETURNING ct.teacher_id`,
        [courseId, userId, campusId],
      );
      if (!rows.length)
        throw new NotFoundException(
          'Affectation introuvable, hors périmètre ou archivée',
        );
      await this.audit.enregistrerDans(query, {
        userId: actorId,
        action: 'affectation_enseignant_suppression',
        courseId,
        objet: `enseignant:${userId}`,
      });
    });
    return { ok: true };
  }

  async listerDelegues(
    programId: number,
    annee: string,
    campusId: number | null,
  ) {
    this.validerAnnee(annee);
    await this.verifierProgramme(programId, campusId);
    return this.db.query(
      `SELECT m.id, m.type_mandat AS type, m.debut, m.fin,
              u.id AS "userId", u.matricule, u.nom, u.prenom
       FROM ref.class_delegate_mandates m
       JOIN identity.users u ON u.id = m.student_id
       WHERE m.program_id = $1 AND m.annee_universitaire = $2
       ORDER BY CASE m.type_mandat WHEN 'titulaire' THEN 0 ELSE 1 END`,
      [programId, annee],
    );
  }

  async enregistrerDelegue(
    programId: number,
    userId: number,
    annee: string,
    type: string,
    debut: string,
    fin: string,
    campusId: number | null,
    actorId: number,
  ) {
    this.validerAnnee(annee);
    if (
      !['titulaire', 'suppleant'].includes(type) ||
      !dateValide(debut) ||
      !dateValide(fin) ||
      fin < debut
    ) {
      throw new BadRequestException('Type ou période de mandat invalide');
    }
    return this.db.transaction(async (query) => {
      await this.verifierProgrammeAvecQuery(query, programId, campusId);
      await this.verifierAnneeOuverte(query, annee);
      const eligible = await query<{ id: number }>(
        `SELECT u.id
         FROM identity.users u
         JOIN identity.user_roles r ON r.user_id = u.id AND r.role = 'delegue'
         JOIN ref.program p ON p.id = $2
         JOIN ref.department d ON d.id = p.department_id
         WHERE u.id = $1 AND u.actif
           AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)
           AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           JOIN ref.course c ON c.id = e.course_id
           WHERE e.student_id = u.id AND c.program_id = p.id
             AND c.annee_universitaire = $3
         )`,
        [userId, programId, annee],
      );
      if (!eligible.length) {
        throw new BadRequestException(
          'Le délégué doit être actif et inscrit dans un cours du programme',
        );
      }
      const otherMandate = await query<{ id: string }>(
        `SELECT id FROM ref.class_delegate_mandates
         WHERE program_id = $1 AND annee_universitaire = $2
           AND student_id = $3 AND type_mandat <> $4`,
        [programId, annee, userId, type],
      );
      if (otherMandate.length) {
        throw new ConflictException(
          'Un délégué ne peut pas cumuler les mandats titulaire et suppléant',
        );
      }
      const mandates = await query<{ id: string; student_id: number }>(
        `INSERT INTO ref.class_delegate_mandates
           (program_id, annee_universitaire, student_id, type_mandat, debut, fin)
         VALUES ($1, $2, $3, $4, $5::date, $6::date)
         ON CONFLICT (program_id, annee_universitaire, type_mandat)
         DO UPDATE SET student_id = EXCLUDED.student_id,
                       debut = EXCLUDED.debut, fin = EXCLUDED.fin
         RETURNING id, student_id`,
        [programId, annee, userId, type, debut, fin],
      );
      await query(
        `INSERT INTO ref.class_delegate (program_id, annee_universitaire, student_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [programId, annee, userId],
      );
      await this.audit.enregistrerDans(query, {
        userId: actorId,
        action: 'mandat_delegue_enregistrement',
        objet: `programme:${programId}:${annee}`,
        detail: type,
      });
      return { id: mandates[0].id, userId: mandates[0].student_id };
    });
  }

  async retirerDelegue(
    programId: number,
    annee: string,
    type: string,
    campusId: number | null,
    actorId: number,
  ) {
    this.validerAnnee(annee);
    if (!['titulaire', 'suppleant'].includes(type)) {
      throw new BadRequestException('Type de mandat invalide');
    }
    return this.db.transaction(async (query) => {
      await this.verifierProgrammeAvecQuery(query, programId, campusId);
      await this.verifierAnneeOuverte(query, annee);
      const deleted = await query<{ student_id: number }>(
        `DELETE FROM ref.class_delegate_mandates
         WHERE program_id = $1 AND annee_universitaire = $2 AND type_mandat = $3
         RETURNING student_id`,
        [programId, annee, type],
      );
      if (!deleted.length) throw new NotFoundException('Mandat introuvable');
      await query(
        `DELETE FROM ref.class_delegate cd
         WHERE cd.program_id = $1 AND cd.annee_universitaire = $2
           AND NOT EXISTS (
             SELECT 1 FROM ref.class_delegate_mandates m
             WHERE m.program_id = cd.program_id
               AND m.annee_universitaire = cd.annee_universitaire
               AND m.student_id = cd.student_id
           )`,
        [programId, annee],
      );
      await this.audit.enregistrerDans(query, {
        userId: actorId,
        action: 'mandat_delegue_suppression',
        objet: `programme:${programId}:${annee}`,
        detail: type,
      });
      return { ok: true };
    });
  }

  private async verifierCours(
    courseId: number,
    campusId: number | null,
  ): Promise<void> {
    const rows = await this.db.query<{ id: number }>(
      `SELECT c.id FROM ref.course c
       JOIN ref.program p ON p.id = c.program_id
       JOIN ref.department d ON d.id = p.department_id
       WHERE c.id = $1 AND ($2::int IS NULL OR d.campus_id = $2)`,
      [courseId, campusId],
    );
    if (!rows.length)
      throw new NotFoundException('Cours introuvable ou hors périmètre');
  }

  private async verifierProgramme(
    programId: number,
    campusId: number | null,
  ): Promise<void> {
    const rows = await this.db.query<{ id: number }>(
      `SELECT p.id FROM ref.program p
       JOIN ref.department d ON d.id = p.department_id
       WHERE p.id = $1 AND ($2::int IS NULL OR d.campus_id = $2)`,
      [programId, campusId],
    );
    if (!rows.length)
      throw new NotFoundException('Programme introuvable ou hors périmètre');
  }

  private async verifierProgrammeAvecQuery(
    query: DatabaseQuery,
    programId: number,
    campusId: number | null,
  ): Promise<void> {
    const rows = await query<{ id: number }>(
      `SELECT p.id FROM ref.program p
       JOIN ref.department d ON d.id = p.department_id
       WHERE p.id = $1 AND ($2::int IS NULL OR d.campus_id = $2)`,
      [programId, campusId],
    );
    if (!rows.length)
      throw new NotFoundException('Programme introuvable ou hors périmètre');
  }

  private async verifierAnneeOuverte(
    query: DatabaseQuery,
    annee: string,
  ): Promise<void> {
    const rows = await query<{ id: number }>(
      'SELECT id FROM academic.annual_archives WHERE annee_universitaire = $1',
      [annee],
    );
    if (rows.length)
      throw new ConflictException(
        'Cette année universitaire est archivée en lecture seule',
      );
  }

  private validerAnnee(annee: string): void {
    if (!ANNEE.test(annee))
      throw new BadRequestException('Année universitaire invalide');
  }
}
