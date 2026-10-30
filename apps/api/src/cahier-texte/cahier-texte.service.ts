import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { ExportService, type FormatExport } from '../exports/export.service';

export type TypeSeance = 'CM' | 'TD' | 'TP' | 'AUTRE';
export type StatutSeance =
  'tenue' | 'reportee' | 'annulee' | 'enseignant_absent' | 'planifiee';
export type StatutVisa = 'en_attente' | 'vise' | 'conteste';

export interface EntreeSeance {
  ueId: number;
  date: string;
  debut: string;
  fin: string;
  type: TypeSeance;
  groupe?: string;
  statut: StatutSeance;
  intitule?: string;
  contenu?: string;
  travailAFaire?: string;
  effectif?: number;
  observations?: string;
}

interface LigneUe {
  ue_id: number;
  code: string;
  intitule: string;
  enseignants: string[];
}

interface LigneSeance {
  id: number;
  ue_id: number;
  ue_code: string;
  ue_intitule: string;
  date: string;
  debut: string;
  fin: string;
  type: TypeSeance;
  groupe: string | null;
  statut: StatutSeance;
  intitule: string | null;
  contenu: string | null;
  travail_a_faire: string | null;
  effectif: number | null;
  observations: string | null;
  visa_statut: StatutVisa;
  visa_commentaire: string | null;
  visa_date: string | null;
  peut_modifier: boolean;
}

@Injectable()
export class CahierTexteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly exports: ExportService,
  ) {}

  async mesUes(userId: number, roles: string[]) {
    const rows = await this.db.query<LigneUe>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule,
              COALESCE(
                array_agg(DISTINCT trim(concat(u.prenom, ' ', u.nom)))
                  FILTER (WHERE u.id IS NOT NULL),
                ARRAY[]::text[]
              ) AS enseignants
       FROM ref.course co
       JOIN ref.ue ue ON ue.id = co.ue_id
       LEFT JOIN ref.course_teacher ct ON ct.course_id = co.id
       LEFT JOIN identity.users u ON u.id = ct.teacher_id
       WHERE (
         ($2::boolean AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $1
         ))
         OR ($3::boolean AND EXISTS (
           SELECT 1 FROM ref.course_teacher own_ct
           WHERE own_ct.course_id = co.id AND own_ct.teacher_id = $1
         ))
         OR ($4::boolean AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           WHERE e.course_id = co.id AND e.student_id = $1
         ))
       )
       GROUP BY co.id, ue.code, ue.intitule
       ORDER BY ue.code`,
      [
        userId,
        roles.includes('delegue'),
        roles.includes('enseignant'),
        roles.includes('etudiant'),
      ],
    );
    return rows.map((row) => ({
      ueId: row.ue_id,
      code: row.code,
      intitule: row.intitule,
      enseignants: row.enseignants,
    }));
  }

  async seances(
    userId: number,
    roles: string[],
    ueId?: number,
    statutVisa?: StatutVisa,
  ) {
    const rows = await this.db.query<LigneSeance>(
      `SELECT s.id, co.id AS ue_id, ue.code AS ue_code, ue.intitule AS ue_intitule,
              to_char(s.date, 'YYYY-MM-DD') AS date,
              to_char(s.debut, 'HH24:MI') AS debut, to_char(s.fin, 'HH24:MI') AS fin,
              s.type, s.groupe, s.statut, s.intitule, s.contenu,
              s.travail_a_faire, s.effectif, s.observations,
              s.visa_statut, s.visa_commentaire,
              CASE WHEN s.visa_date IS NULL THEN NULL
                   ELSE to_char(s.visa_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              END AS visa_date,
              ($4::boolean AND EXISTS (
                SELECT 1 FROM ref.class_delegate cd
                WHERE cd.program_id = co.program_id
                  AND cd.annee_universitaire = co.annee_universitaire
                  AND cd.student_id = $1
              )) AS peut_modifier
       FROM academic.class_sessions s
       JOIN ref.course co ON co.id = s.course_id
       JOIN ref.ue ue ON ue.id = co.ue_id
       WHERE ($2::int IS NULL OR co.id = $2)
         AND ($3::text IS NULL OR s.visa_statut = $3)
         AND (
           ($4::boolean AND EXISTS (
             SELECT 1 FROM ref.class_delegate cd
             WHERE cd.program_id = co.program_id
               AND cd.annee_universitaire = co.annee_universitaire
               AND cd.student_id = $1
           ))
           OR ($5::boolean AND EXISTS (
             SELECT 1 FROM ref.course_teacher ct
             WHERE ct.course_id = co.id AND ct.teacher_id = $1
           ))
           OR ($6::boolean AND (s.visa_statut = 'vise' OR s.statut = 'planifiee') AND EXISTS (
             SELECT 1 FROM ref.enrollment e
             WHERE e.course_id = co.id AND e.student_id = $1
           ))
         )
       ORDER BY s.date DESC, s.debut DESC, s.id DESC`,
      [
        userId,
        ueId ?? null,
        statutVisa ?? null,
        roles.includes('delegue'),
        roles.includes('enseignant'),
        roles.includes('etudiant'),
      ],
    );
    return rows.map((row) => this.formaterSeance(row));
  }

  async creer(userId: number, seance: EntreeSeance) {
    const rows = await this.db.transaction(async (query) => {
      const rows = await query<{ id: number }>(
        `INSERT INTO academic.class_sessions (
         course_id, created_by, date, debut, fin, type, groupe, statut,
         intitule, contenu, travail_a_faire, effectif, observations
       )
       SELECT co.id, $2, $3::date, $4::time, $5::time, $6, $7, $8,
              $9, $10, $11, $12, $13
       FROM ref.course co
       WHERE co.id = $1 AND EXISTS (
         SELECT 1 FROM ref.class_delegate cd
         WHERE cd.program_id = co.program_id
           AND cd.annee_universitaire = co.annee_universitaire
           AND cd.student_id = $2
       )
       RETURNING id`,
        [
          seance.ueId,
          userId,
          seance.date,
          seance.debut,
          seance.fin,
          seance.type,
          seance.groupe ?? null,
          seance.statut,
          seance.intitule ?? null,
          seance.contenu ?? null,
          seance.travailAFaire ?? null,
          seance.effectif ?? null,
          seance.observations ?? null,
        ],
      );
      if (rows[0]) {
        await this.audit.enregistrerDans(query, {
          userId,
          action: 'cahier_seance_creation',
          courseId: seance.ueId,
          objet: `seance:${rows[0].id}`,
        });
      }
      return rows;
    });
    if (!rows[0])
      throw new NotFoundException('UE introuvable ou hors de votre délégation');
    const resultat = await this.seances(userId, ['delegue'], seance.ueId);
    const creee = resultat.find((item) => item.id === rows[0].id);
    if (!creee)
      throw new NotFoundException('Séance introuvable après création');
    return creee;
  }

  async modifier(userId: number, id: number, seance: EntreeSeance) {
    const rows = await this.db.transaction(async (query) => {
      const rows = await query<{ id: number }>(
        `UPDATE academic.class_sessions s
       SET course_id = co.id, date = $3::date, debut = $4::time, fin = $5::time,
           type = $6, groupe = $7, statut = $8, intitule = $9, contenu = $10,
           travail_a_faire = $11, effectif = $12, observations = $13,
           visa_statut = 'en_attente', visa_commentaire = NULL, visa_date = NULL,
           visa_par = NULL,
           updated_at = NOW()
       FROM ref.course co
       WHERE s.id = $1 AND co.id = $2
         AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $14
         )
         AND EXISTS (
           SELECT 1
           FROM ref.course old_co
           JOIN ref.class_delegate old_cd
             ON old_cd.program_id = old_co.program_id
            AND old_cd.annee_universitaire = old_co.annee_universitaire
           WHERE old_co.id = s.course_id AND old_cd.student_id = $14
         )
       RETURNING s.id`,
        [
          id,
          seance.ueId,
          seance.date,
          seance.debut,
          seance.fin,
          seance.type,
          seance.groupe ?? null,
          seance.statut,
          seance.intitule ?? null,
          seance.contenu ?? null,
          seance.travailAFaire ?? null,
          seance.effectif ?? null,
          seance.observations ?? null,
          userId,
        ],
      );
      if (rows[0]) {
        await this.audit.enregistrerDans(query, {
          userId,
          action: 'cahier_seance_modification',
          courseId: seance.ueId,
          objet: `seance:${id}`,
        });
      }
      return rows;
    });
    if (!rows[0])
      throw new ConflictException(
        'Séance introuvable ou hors de votre délégation',
      );
    const resultat = await this.seances(userId, ['delegue'], seance.ueId);
    const modifiee = resultat.find((item) => item.id === id);
    if (!modifiee)
      throw new NotFoundException('Séance introuvable après modification');
    return modifiee;
  }

  async viser(
    userId: number,
    id: number,
    decision: Exclude<StatutVisa, 'en_attente'>,
    commentaire?: string,
  ) {
    const rows = await this.db.transaction(async (query) => {
      const rows = await query<{ id: number }>(
        `UPDATE academic.class_sessions s
       SET visa_statut = $3, visa_commentaire = $4, visa_date = NOW(),
           visa_par = $2, updated_at = NOW()
       WHERE s.id = $1 AND s.visa_statut <> 'vise'
         AND s.statut <> 'planifiee'
         AND EXISTS (
           SELECT 1 FROM ref.course_teacher ct
           WHERE ct.course_id = s.course_id AND ct.teacher_id = $2
         )
       RETURNING s.id`,
        [id, userId, decision, commentaire ?? null],
      );
      if (rows[0]) {
        await this.audit.enregistrerDans(query, {
          userId,
          action: 'cahier_seance_visa',
          objet: `seance:${id}`,
          detail: decision,
        });
      }
      return rows;
    });
    if (!rows[0])
      throw new NotFoundException(
        'Séance introuvable ou non affectée à cet enseignant',
      );
    const resultat = await this.seances(userId, ['enseignant']);
    const visee = resultat.find((item) => item.id === id);
    if (!visee) throw new NotFoundException('Séance introuvable après visa');
    return visee;
  }

  async historique(userId: number, roles: string[], id: number) {
    const rows = await this.db.query<{
      id: number;
      snapshot: Record<string, unknown>;
      cree_le: string;
    }>(
      `SELECT v.id, v.snapshot,
              to_char(v.cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cree_le
       FROM academic.class_session_versions v
       JOIN academic.class_sessions s ON s.id = v.session_id
       JOIN ref.course co ON co.id = s.course_id
       WHERE s.id = $1 AND (
         ($2::boolean AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $3
         ))
         OR ($4::boolean AND EXISTS (
           SELECT 1 FROM ref.course_teacher ct
           WHERE ct.course_id = co.id AND ct.teacher_id = $3
         ))
         OR ($5::boolean AND s.visa_statut = 'vise' AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           WHERE e.course_id = co.id AND e.student_id = $3
         ))
       )
       ORDER BY v.id DESC`,
      [
        id,
        roles.includes('delegue'),
        userId,
        roles.includes('enseignant'),
        roles.includes('etudiant'),
      ],
    );
    if (rows.length) {
      await this.audit.enregistrer({
        userId,
        action: 'cahier_historique_consultation',
        objet: `seance:${id}`,
      });
    }
    return rows.map((row) => ({
      id: row.id,
      creeLe: row.cree_le,
      seance: row.snapshot,
    }));
  }

  async listerPieces(userId: number, roles: string[], id: number) {
    const rows = await this.db.query<{
      id: number;
      file_name: string;
      mime_type: string;
      cree_le: string;
    }>(
      `SELECT a.id, a.file_name, a.mime_type,
              to_char(a.cree_le AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS cree_le
       FROM academic.class_session_attachments a
       JOIN academic.class_sessions s ON s.id = a.session_id
       JOIN ref.course co ON co.id = s.course_id
       WHERE s.id = $1 AND (
         ($2::boolean AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $3
         ))
         OR ($4::boolean AND EXISTS (
           SELECT 1 FROM ref.course_teacher ct
           WHERE ct.course_id = co.id AND ct.teacher_id = $3
         ))
         OR ($5::boolean AND s.visa_statut = 'vise' AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           WHERE e.course_id = co.id AND e.student_id = $3
         ))
       )
       ORDER BY a.cree_le, a.id`,
      [
        id,
        roles.includes('delegue'),
        userId,
        roles.includes('enseignant'),
        roles.includes('etudiant'),
      ],
    );
    if (rows.length) {
      await this.audit.enregistrer({
        userId,
        action: 'cahier_pieces_consultation',
        objet: `seance:${id}`,
      });
    }
    return rows.map((row) => ({
      id: row.id,
      nom: row.file_name,
      mime: row.mime_type,
      creeLe: row.cree_le,
    }));
  }

  async ajouterPiece(
    userId: number,
    id: number,
    fichier: { nom: string; mime: string; contenu: Buffer },
  ) {
    const rows = await this.db.transaction(async (query) => {
      const rows = await query<{ id: number }>(
        `INSERT INTO academic.class_session_attachments
         (session_id, uploaded_by, file_name, mime_type, content)
       SELECT s.id, $2, $3, $4, $5
       FROM academic.class_sessions s
       JOIN ref.course co ON co.id = s.course_id
       WHERE s.id = $1 AND EXISTS (
         SELECT 1 FROM ref.class_delegate cd
         WHERE cd.program_id = co.program_id
           AND cd.annee_universitaire = co.annee_universitaire
           AND cd.student_id = $2
       ) AND s.visa_statut <> 'vise'
       RETURNING id`,
        [id, userId, fichier.nom, fichier.mime, fichier.contenu],
      );
      if (rows[0]) {
        await this.audit.enregistrerDans(query, {
          userId,
          action: 'cahier_piece_jointe',
          objet: `seance:${id}`,
        });
      }
      return rows;
    });
    if (!rows[0])
      throw new NotFoundException(
        'Séance introuvable ou hors de votre délégation',
      );
    return { id: rows[0].id, nom: fichier.nom, mime: fichier.mime };
  }

  async telechargerPiece(userId: number, roles: string[], pieceId: number) {
    const rows = await this.db.query<{
      id: number;
      file_name: string;
      mime_type: string;
      content: Buffer;
      session_id: number;
    }>(
      `SELECT a.id, a.session_id, a.file_name, a.mime_type, a.content
       FROM academic.class_session_attachments a
       JOIN academic.class_sessions s ON s.id = a.session_id
       JOIN ref.course co ON co.id = s.course_id
       WHERE a.id = $1 AND (
         ($2::boolean AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $3
         ))
         OR ($4::boolean AND EXISTS (
           SELECT 1 FROM ref.course_teacher ct
           WHERE ct.course_id = co.id AND ct.teacher_id = $3
         ))
         OR ($5::boolean AND s.visa_statut = 'vise' AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           WHERE e.course_id = co.id AND e.student_id = $3
         ))
       )`,
      [
        pieceId,
        roles.includes('delegue'),
        userId,
        roles.includes('enseignant'),
        roles.includes('etudiant'),
      ],
    );
    if (!rows[0]) throw new NotFoundException('Pièce jointe introuvable');
    await this.audit.enregistrer({
      userId,
      action: 'cahier_piece_telechargement',
      objet: `seance:${rows[0].session_id}`,
    });
    return {
      nom: rows[0].file_name,
      mime: rows[0].mime_type,
      contenu: rows[0].content,
    };
  }

  async exporter(
    userId: number,
    roles: string[],
    format: FormatExport,
    ueId?: number,
  ) {
    const seances = await this.seances(userId, roles, ueId);
    await this.audit.enregistrer({
      userId,
      action: 'cahier_export',
      courseId: ueId,
      detail: format,
    });
    const lignes = seances.map((seance) => ({
      ue: `${seance.ueCode}  -  ${seance.ueIntitule}`,
      date: seance.date,
      horaire: `${seance.debut}  -  ${seance.fin}`,
      type: seance.type,
      intitule: seance.intitule ?? '',
      contenu: seance.contenu ?? '',
      travail: seance.travailAFaire ?? '',
      visa: seance.visa.statut,
    }));
    return this.exports.generer(format, 'Cahier de texte', lignes);
  }

  async avancement(userId: number, roles: string[], ueId: number) {
    const rows = await this.db.query<{
      ue_id: number;
      heures_cm_prevues: number;
      heures_td_prevues: number;
      heures_tp_prevues: number;
      heures_cm_effectuees: number | null;
      heures_td_effectuees: number | null;
      heures_tp_effectuees: number | null;
    }>(
      `SELECT co.id AS ue_id, co.heures_cm_prevues, co.heures_td_prevues, co.heures_tp_prevues,
              COALESCE(SUM(EXTRACT(EPOCH FROM (s.fin - s.debut)) / 3600)
                FILTER (WHERE s.type = 'CM' AND s.statut = 'tenue'), 0) AS heures_cm_effectuees,
              COALESCE(SUM(EXTRACT(EPOCH FROM (s.fin - s.debut)) / 3600)
                FILTER (WHERE s.type = 'TD' AND s.statut = 'tenue'), 0) AS heures_td_effectuees,
              COALESCE(SUM(EXTRACT(EPOCH FROM (s.fin - s.debut)) / 3600)
                FILTER (WHERE s.type = 'TP' AND s.statut = 'tenue'), 0) AS heures_tp_effectuees
       FROM ref.course co
       LEFT JOIN academic.class_sessions s ON s.course_id = co.id
       WHERE co.id = $1 AND (
         ($3::boolean AND EXISTS (
           SELECT 1 FROM ref.class_delegate cd
           WHERE cd.program_id = co.program_id
             AND cd.annee_universitaire = co.annee_universitaire
             AND cd.student_id = $2
         ))
         OR ($4::boolean AND EXISTS (
           SELECT 1 FROM ref.course_teacher ct
           WHERE ct.course_id = co.id AND ct.teacher_id = $2
         ))
       )
       GROUP BY co.id`,
      [ueId, userId, roles.includes('delegue'), roles.includes('enseignant')],
    );
    const row = rows[0];
    if (!row)
      throw new NotFoundException('UE introuvable ou hors de votre périmètre');
    return {
      ueId: row.ue_id,
      heuresPrevues: {
        cm: Number(row.heures_cm_prevues),
        td: Number(row.heures_td_prevues),
        tp: Number(row.heures_tp_prevues),
      },
      heuresEffectuees: {
        cm: Number(row.heures_cm_effectuees ?? 0),
        td: Number(row.heures_td_effectuees ?? 0),
        tp: Number(row.heures_tp_effectuees ?? 0),
      },
    };
  }

  private formaterSeance(row: LigneSeance) {
    return {
      id: row.id,
      ueId: row.ue_id,
      ueCode: row.ue_code,
      ueIntitule: row.ue_intitule,
      date: row.date,
      debut: row.debut,
      fin: row.fin,
      type: row.type,
      groupe: row.groupe ?? undefined,
      statut: row.statut,
      intitule: row.intitule ?? undefined,
      contenu: row.contenu ?? undefined,
      travailAFaire: row.travail_a_faire ?? undefined,
      effectif: row.effectif ?? undefined,
      observations: row.observations ?? undefined,
      visa: {
        statut: row.visa_statut,
        commentaire: row.visa_commentaire ?? undefined,
        date: row.visa_date ?? undefined,
      },
      modifiable: row.peut_modifier,
    };
  }
}
