import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

const ANNEE = /^\d{4}-\d{4}$/;

@Injectable()
export class AnnualArchivesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async lister() {
    return this.db.query(
      `SELECT a.annee_universitaire AS "anneeUniversitaire",
              a.archive_le AS "archiveLe",
              u.nom AS "archiveParNom",
              u.prenom AS "archiveParPrenom"
       FROM academic.annual_archives a
       JOIN identity.users u ON u.id = a.archive_par
       ORDER BY a.annee_universitaire DESC`,
    );
  }

  async lire(annee: string) {
    this.validerAnnee(annee);
    const rows = await this.db.query(
      `SELECT annee_universitaire AS "anneeUniversitaire",
              snapshot,
              archive_par AS "archivePar",
              archive_le AS "archiveLe"
       FROM academic.annual_archives
       WHERE annee_universitaire = $1`,
      [annee],
    );
    if (!rows.length)
      throw new NotFoundException('Archive annuelle introuvable');
    return rows[0];
  }

  async creer(annee: string, userId: number) {
    this.validerAnnee(annee);
    return this.db.transaction(async (query) => {
      const snapshots = await query<{ snapshot: Record<string, unknown> }>(
        `SELECT jsonb_build_object(
           'cours', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', c.id, 'ueId', c.ue_id, 'ueCode', u.code,
               'ueIntitule', u.intitule, 'programmeId', c.program_id,
               'anneeUniversitaire', c.annee_universitaire, 'semestre', c.semestre
             ) ORDER BY c.id)
             FROM ref.course c JOIN ref.ue u ON u.id = c.ue_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb),
           'enseignants', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'coursId', ct.course_id, 'userId', u.id,
               'matricule', u.matricule, 'nom', u.nom, 'prenom', u.prenom
             ) ORDER BY ct.course_id, u.id)
             FROM ref.course_teacher ct
             JOIN ref.course c ON c.id = ct.course_id
             JOIN identity.users u ON u.id = ct.teacher_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb),
           'inscriptions', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'coursId', e.course_id, 'etudiantId', e.student_id,
               'matricule', u.matricule, 'nom', u.nom, 'prenom', u.prenom
             ) ORDER BY e.course_id, e.student_id)
             FROM ref.enrollment e
             JOIN ref.course c ON c.id = e.course_id
             JOIN identity.users u ON u.id = e.student_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb),
           'delegues', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'programmeId', m.program_id, 'userId', m.student_id,
               'matricule', u.matricule, 'type', m.type_mandat,
               'debut', m.debut, 'fin', m.fin
             ) ORDER BY m.program_id, m.type_mandat)
             FROM (
               SELECT program_id, student_id, type_mandat, debut, fin
               FROM ref.class_delegate_mandates
               WHERE annee_universitaire = $1
               UNION ALL
               SELECT cd.program_id, cd.student_id, 'historique'::varchar, NULL::date, NULL::date
               FROM ref.class_delegate cd
               WHERE cd.annee_universitaire = $1
                 AND NOT EXISTS (
                   SELECT 1 FROM ref.class_delegate_mandates m
                   WHERE m.program_id = cd.program_id
                     AND m.annee_universitaire = cd.annee_universitaire
                     AND m.student_id = cd.student_id
                 )
             ) m
             JOIN identity.users u ON u.id = m.student_id
           ), '[]'::jsonb),
           'notes', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'evaluationId', ac.id, 'coursId', ac.course_id,
               'etudiantId', sc.student_id, 'note', sc.note,
               'bareme', ac.bareme, 'type', ac.type, 'libelle', ac.libelle
             ) ORDER BY ac.course_id, ac.id, sc.student_id)
             FROM academic.assessment_scores sc
             JOIN academic.assessment_columns ac ON ac.id = sc.assessment_id
             JOIN ref.course c ON c.id = ac.course_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb),
           'presences', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'seanceId', ar.session_id, 'coursId', ar.course_id,
               'etudiantId', ar.student_id, 'statut', ar.statut,
               'date', ats.date, 'libelle', ats.libelle
             ) ORDER BY ats.date, ar.session_id, ar.student_id)
             FROM academic.attendance_records ar
             JOIN academic.attendance_sessions ats ON ats.id = ar.session_id
             JOIN ref.course c ON c.id = ar.course_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb),
           'cahierTexte', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', s.id, 'coursId', s.course_id, 'date', s.date,
               'debut', s.debut, 'fin', s.fin, 'type', s.type,
               'statut', s.statut, 'intitule', s.intitule, 'contenu', s.contenu,
               'travailAFaire', s.travail_a_faire, 'visaStatut', s.visa_statut,
               'visaCommentaire', s.visa_commentaire, 'visaDate', s.visa_date,
               'visaPar', s.visa_par
             ) ORDER BY s.date, s.debut, s.id)
             FROM academic.class_sessions s
             JOIN ref.course c ON c.id = s.course_id
             WHERE c.annee_universitaire = $1
           ), '[]'::jsonb)
         ) AS snapshot`,
        [annee],
      );
      const archived = await query<{ id: number; archive_le: Date }>(
        `INSERT INTO academic.annual_archives
           (annee_universitaire, snapshot, archive_par)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (annee_universitaire) DO NOTHING
         RETURNING id, archive_le`,
        [annee, JSON.stringify(snapshots[0].snapshot), userId],
      );
      if (!archived.length)
        throw new ConflictException('Cette année est déjà archivée');
      await this.audit.enregistrerDans(query, {
        userId,
        action: 'archive_annuelle_creation',
        objet: `annee:${annee}`,
      });
      return {
        anneeUniversitaire: annee,
        archiveLe: archived[0].archive_le,
      };
    });
  }

  private validerAnnee(annee: string): void {
    const annees = annee.split('-').map(Number);
    if (!ANNEE.test(annee) || annees[1] !== annees[0] + 1) {
      throw new BadRequestException(
        'Année universitaire invalide (format AAAA-AAAA)',
      );
    }
  }
}
