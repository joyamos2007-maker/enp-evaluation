import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { DatabaseQuery, DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

export type TypeImportAcademique =
  | 'etudiants'
  | 'enseignants'
  | 'ue'
  | 'offres'
  | 'affectations'
  | 'inscriptions'
  | 'delegues';

interface LigneCsv {
  [cle: string]: string;
}

export interface ErreurLigne {
  ligne: number;
  colonne?: string;
  message: string;
}

interface ImportStage {
  id: string;
  campus_id: number | null;
  valid_rows: LigneCsv[];
  errors: ErreurLigne[];
  lignes_total: number;
  statut: 'en_attente' | 'termine';
  resultat: { crees: number; misAJour: number } | null;
  expire_le: Date;
}

const COLONNES: Record<TypeImportAcademique, string[]> = {
  etudiants: ['matricule', 'email', 'nom', 'prenom'],
  enseignants: ['matricule', 'email', 'nom', 'prenom'],
  ue: ['code', 'intitule', 'credits'],
  offres: ['uecode', 'programid', 'anneeuniversitaire', 'semestre'],
  affectations: ['courseid', 'matricule'],
  inscriptions: ['courseid', 'matricule'],
  delegues: [
    'programid',
    'matricule',
    'anneeuniversitaire',
    'type',
    'debut',
    'fin',
  ],
};

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
export class AcademicImportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async verifier(
    type: TypeImportAcademique,
    contenu: Buffer,
    userId: number,
    campusId: number | null,
  ) {
    let records: string[][];
    try {
      records = parse(contenu, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false,
      }) as string[][];
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Format CSV invalide';
      throw new BadRequestException(`Fichier CSV invalide : ${detail}`);
    }
    if (records.length === 0)
      throw new BadRequestException('Le fichier CSV est vide');
    if (records.length > 2001)
      throw new BadRequestException('Maximum 2 000 lignes par import');

    const headers = records.shift()?.map((header) => header.toLowerCase());
    const expected = COLONNES[type];
    if (
      !headers ||
      headers.length !== expected.length ||
      headers.some((header, index) => header !== expected[index])
    ) {
      throw new BadRequestException(
        `En-têtes attendus : ${expected.join(', ')}`,
      );
    }

    const validRows: LigneCsv[] = [];
    const errors: ErreurLigne[] = [];
    const deduplication = new Set<string>();
    for (const [index, values] of records.entries()) {
      const row = Object.fromEntries(
        headers.map((header, column) => [header, values[column] ?? '']),
      );
      try {
        await this.validerLigne(type, row, campusId);
        const key = this.cleImport(type, row);
        if (deduplication.has(key)) {
          throw new BadRequestException('Ligne dupliquée dans le fichier');
        }
        deduplication.add(key);
        validRows.push(row);
      } catch (error) {
        errors.push({
          ligne: index + 2,
          message: error instanceof Error ? error.message : 'Ligne invalide',
        });
      }
    }

    const saved = await this.db.query<{ id: string }>(
      `INSERT INTO academic.import_staging
         (type, requested_by, campus_id, valid_rows, errors, lignes_total)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING id`,
      [
        type,
        userId,
        campusId,
        JSON.stringify(validRows),
        JSON.stringify(errors),
        records.length,
      ],
    );
    return {
      importId: saved[0].id,
      lignesTotal: records.length,
      lignesValides: validRows.length,
      erreurs: errors,
    };
  }

  async valider(
    type: TypeImportAcademique,
    importId: string,
    userId: number,
    currentCampusId: number | null,
  ): Promise<{ crees: number; misAJour: number }> {
    if (!/^[0-9a-f-]{36}$/i.test(importId)) {
      throw new BadRequestException('Identifiant d’import invalide');
    }
    return this.db.transaction(async (query) => {
      const stages = await query<ImportStage>(
        `SELECT id, campus_id, valid_rows, errors, lignes_total, statut, resultat, expire_le
         FROM academic.import_staging
         WHERE id = $1 AND requested_by = $2 AND type = $3
         FOR UPDATE`,
        [importId, userId, type],
      );
      const stage = stages[0];
      if (!stage || stage.expire_le <= new Date()) {
        throw new NotFoundException('Import introuvable ou expiré');
      }
      if (stage.campus_id !== currentCampusId) {
        throw new NotFoundException(
          'Le périmètre campus de cet import a changé',
        );
      }
      if (stage.statut === 'termine' && stage.resultat) return stage.resultat;

      let crees = 0;
      let misAJour = 0;
      for (const row of stage.valid_rows) {
        const resultat = await this.appliquer(
          query,
          type,
          row,
          stage.campus_id,
        );
        if (resultat.cree) crees++;
        else if (resultat.modifie) misAJour++;
      }
      const resultat = { crees, misAJour };
      await query(
        `UPDATE academic.import_staging
         SET statut = 'termine', resultat = $2::jsonb
         WHERE id = $1`,
        [importId, JSON.stringify(resultat)],
      );
      await this.audit.enregistrerDans(query, {
        userId,
        action: 'import_academique_application',
        objet: `import:${type}`,
        detail: `${crees} création(s), ${misAJour} mise(s) à jour`,
      });
      return resultat;
    });
  }

  private async validerLigne(
    type: TypeImportAcademique,
    row: LigneCsv,
    campusId: number | null,
  ): Promise<void> {
    if (type === 'etudiants' || type === 'enseignants') {
      this.obligatoire(row, ['matricule', 'email', 'nom', 'prenom']);
      if (
        row.matricule.length > 30 ||
        row.nom.length > 100 ||
        row.prenom.length > 100
      ) {
        throw new BadRequestException('Matricule ou nom trop long');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        throw new BadRequestException('Adresse e-mail invalide');
      }
      const conflict = await this.db.query<{ id: number }>(
        `SELECT id FROM identity.users
         WHERE LOWER(email) = LOWER($1) AND matricule <> $2`,
        [row.email, row.matricule],
      );
      if (conflict.length)
        throw new BadRequestException(
          'Adresse e-mail déjà associée à un autre matricule',
        );
      const role = type === 'etudiants' ? 'etudiant' : 'enseignant';
      const campusConflict = await this.db.query<{ campus_id: number }>(
        `SELECT r.campus_id
         FROM identity.users u
         JOIN identity.user_roles r ON r.user_id = u.id AND r.role = $2
         WHERE u.matricule = $1 AND $3::int IS NOT NULL
           AND r.campus_id IS NOT NULL AND r.campus_id <> $3`,
        [row.matricule, role, campusId],
      );
      if (campusConflict.length)
        throw new BadRequestException(
          'Le compte est déjà rattaché à un autre campus',
        );
      return;
    }

    if (type === 'ue') {
      this.obligatoire(row, ['code', 'intitule', 'credits']);
      if (
        row.code.length > 50 ||
        row.intitule.length > 300 ||
        !/^[1-9]\d*$/.test(row.credits)
      ) {
        throw new BadRequestException('Code, intitulé ou crédits invalides');
      }
      return;
    }

    if (type === 'offres') {
      this.obligatoire(row, [
        'uecode',
        'programid',
        'anneeuniversitaire',
        'semestre',
      ]);
      this.entier(row.programid, 'programId');
      const semester = this.entier(row.semestre, 'semestre');
      if (!ANNEE.test(row.anneeuniversitaire) || semester > 10) {
        throw new BadRequestException(
          'Année universitaire ou semestre invalide',
        );
      }
      const programs = await this.db.query<{ id: number }>(
        `SELECT p.id FROM ref.program p
         JOIN ref.department d ON d.id = p.department_id
         JOIN ref.ue u ON u.code = $1
         WHERE p.id = $2 AND ($3::int IS NULL OR d.campus_id = $3)`,
        [row.uecode, Number(row.programid), campusId],
      );
      if (!programs.length)
        throw new BadRequestException(
          'UE, programme ou périmètre campus invalide',
        );
      await this.verifierAnneeNonArchivee(row.anneeuniversitaire);
      return;
    }

    if (type === 'affectations' || type === 'inscriptions') {
      this.obligatoire(row, ['courseid', 'matricule']);
      const courseId = this.entier(row.courseid, 'courseId');
      const userRole = type === 'affectations' ? 'enseignant' : 'etudiant';
      const references = await this.db.query<{
        id: number;
        annee_universitaire: string;
      }>(
        `SELECT c.id, c.annee_universitaire
         FROM ref.course c
         JOIN ref.program p ON p.id = c.program_id
         JOIN ref.department d ON d.id = p.department_id
         JOIN identity.users u ON u.matricule = $1
         JOIN identity.user_roles r ON r.user_id = u.id AND (
           r.role = $2 OR ($2 = 'etudiant' AND r.role = 'delegue')
         )
         WHERE c.id = $3 AND ($4::int IS NULL OR d.campus_id = $4)
           AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)`,
        [row.matricule, userRole, courseId, campusId],
      );
      if (!references.length)
        throw new BadRequestException(
          'Cours, compte ou rôle invalide pour le périmètre',
        );
      await this.verifierAnneeNonArchivee(references[0].annee_universitaire);
      return;
    }

    this.obligatoire(row, [
      'programid',
      'matricule',
      'anneeuniversitaire',
      'type',
      'debut',
      'fin',
    ]);
    const programId = this.entier(row.programid, 'programId');
    if (
      !ANNEE.test(row.anneeuniversitaire) ||
      !['titulaire', 'suppleant'].includes(row.type) ||
      !dateValide(row.debut) ||
      !dateValide(row.fin) ||
      row.fin < row.debut
    ) {
      throw new BadRequestException('Mandat, année ou dates invalides');
    }
    const delegate = await this.db.query<{ id: number }>(
      `SELECT u.id
       FROM identity.users u
       JOIN identity.user_roles r ON r.user_id = u.id AND r.role = 'delegue'
       JOIN ref.program p ON p.id = $2
       JOIN ref.department d ON d.id = p.department_id
       WHERE u.matricule = $1
         AND ($3::int IS NULL OR d.campus_id = $3)
         AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)
         AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           JOIN ref.course c ON c.id = e.course_id
           WHERE e.student_id = u.id AND c.program_id = p.id
             AND c.annee_universitaire = $4
         )`,
      [row.matricule, programId, campusId, row.anneeuniversitaire],
    );
    if (!delegate.length)
      throw new BadRequestException(
        'Le délégué doit être inscrit dans un cours de ce programme',
      );
    await this.verifierAnneeNonArchivee(row.anneeuniversitaire);
  }

  private async appliquer(
    query: DatabaseQuery,
    type: TypeImportAcademique,
    row: LigneCsv,
    campusId: number | null,
  ): Promise<{ cree: boolean; modifie: boolean }> {
    if (type === 'ue') {
      const rows = await query<{ cree: boolean }>(
        `INSERT INTO ref.ue (code, intitule, credits)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE
         SET intitule = EXCLUDED.intitule, credits = EXCLUDED.credits
         RETURNING (xmax = 0) AS cree`,
        [row.code, row.intitule, Number(row.credits)],
      );
      return { cree: rows[0].cree, modifie: !rows[0].cree };
    }
    if (type === 'etudiants' || type === 'enseignants') {
      const role = type === 'etudiants' ? 'etudiant' : 'enseignant';
      const rows = await query<{ user_created: boolean }>(
        `WITH account AS (
           INSERT INTO identity.users (matricule, email, nom, prenom, actif)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (matricule) DO UPDATE
           SET email = EXCLUDED.email, nom = EXCLUDED.nom, prenom = EXCLUDED.prenom
           RETURNING id, (xmax = 0) AS user_created
         ), role AS (
           INSERT INTO identity.user_roles (user_id, role, campus_id)
           SELECT id, $5, $6 FROM account
           ON CONFLICT (user_id, role) DO UPDATE
           SET campus_id = COALESCE(identity.user_roles.campus_id, EXCLUDED.campus_id)
           RETURNING user_id
         )
         SELECT account.user_created FROM account JOIN role ON role.user_id = account.id`,
        [
          row.matricule,
          row.email.toLowerCase(),
          row.nom,
          row.prenom,
          role,
          campusId,
        ],
      );
      return { cree: rows[0].user_created, modifie: !rows[0].user_created };
    }
    if (type === 'offres') {
      const rows = await query<{ cree: boolean }>(
        `INSERT INTO ref.course (ue_id, program_id, annee_universitaire, semestre)
         SELECT u.id, p.id, $3, $4
         FROM ref.ue u CROSS JOIN ref.program p
         JOIN ref.department d ON d.id = p.department_id
         WHERE u.code = $1 AND p.id = $2
           AND ($5::int IS NULL OR d.campus_id = $5)
           AND NOT EXISTS (
             SELECT 1 FROM academic.annual_archives a
             WHERE a.annee_universitaire = $3
           )
         ON CONFLICT (ue_id, program_id, annee_universitaire, semestre)
         DO UPDATE SET semestre = EXCLUDED.semestre
         RETURNING (xmax = 0) AS cree`,
        [
          row.uecode,
          Number(row.programid),
          row.anneeuniversitaire,
          Number(row.semestre),
          campusId,
        ],
      );
      if (!rows[0])
        throw new BadRequestException(
          'Offre de cours non créée : année archivée ou référentiel modifié',
        );
      return { cree: rows[0].cree, modifie: !rows[0].cree };
    }
    if (type === 'inscriptions' || type === 'affectations') {
      const table =
        type === 'inscriptions' ? 'ref.enrollment' : 'ref.course_teacher';
      const role = type === 'inscriptions' ? 'etudiant' : 'enseignant';
      const userColumn = type === 'inscriptions' ? 'student_id' : 'teacher_id';
      const rows = await query<{ id: number }>(
        `INSERT INTO ${table} (course_id, ${userColumn})
         SELECT c.id, u.id
         FROM ref.course c
         JOIN ref.program p ON p.id = c.program_id
         JOIN ref.department d ON d.id = p.department_id
         JOIN identity.users u ON u.matricule = $2
         JOIN identity.user_roles r ON r.user_id = u.id AND (
           r.role = $3 OR ($3 = 'etudiant' AND r.role = 'delegue')
         )
         WHERE c.id = $1 AND ($4::int IS NULL OR d.campus_id = $4)
           AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)
           AND NOT EXISTS (
             SELECT 1 FROM academic.annual_archives a
             WHERE a.annee_universitaire = c.annee_universitaire
           )
         ON CONFLICT DO NOTHING
         RETURNING ${userColumn} AS id`,
        [Number(row.courseid), row.matricule, role, campusId],
      );
      return { cree: rows.length > 0, modifie: false };
    }

    const mandates = await query<{ cree: boolean; student_id: number }>(
      `INSERT INTO ref.class_delegate_mandates
         (program_id, annee_universitaire, student_id, type_mandat, debut, fin)
       SELECT p.id, $2, u.id, $4, $5::date, $6::date
       FROM ref.program p
       JOIN ref.department d ON d.id = p.department_id
       JOIN identity.users u ON u.matricule = $3
       JOIN identity.user_roles r ON r.user_id = u.id AND r.role = 'delegue'
       WHERE p.id = $1 AND ($7::int IS NULL OR d.campus_id = $7)
         AND (r.campus_id IS NULL OR r.campus_id = d.campus_id)
         AND EXISTS (
           SELECT 1 FROM ref.enrollment e
           JOIN ref.course c ON c.id = e.course_id
           WHERE e.student_id = u.id AND c.program_id = p.id
             AND c.annee_universitaire = $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM academic.annual_archives a
           WHERE a.annee_universitaire = $2
         )
       ON CONFLICT (program_id, annee_universitaire, type_mandat)
       DO UPDATE SET student_id = EXCLUDED.student_id,
                     debut = EXCLUDED.debut,
                     fin = EXCLUDED.fin
       RETURNING (xmax = 0) AS cree, student_id`,
      [
        Number(row.programid),
        row.anneeuniversitaire,
        row.matricule,
        row.type,
        row.debut,
        row.fin,
        campusId,
      ],
    );
    if (!mandates[0])
      throw new BadRequestException(
        'Mandat non créé : année archivée ou référentiel modifié',
      );
    await query(
      `INSERT INTO ref.class_delegate (program_id, annee_universitaire, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [Number(row.programid), row.anneeuniversitaire, mandates[0].student_id],
    );
    return { cree: mandates[0].cree, modifie: !mandates[0].cree };
  }

  private async verifierAnneeNonArchivee(annee: string): Promise<void> {
    const rows = await this.db.query<{ id: number }>(
      'SELECT id FROM academic.annual_archives WHERE annee_universitaire = $1',
      [annee],
    );
    if (rows.length)
      throw new BadRequestException(
        'Cette année universitaire est archivée et en lecture seule',
      );
  }

  private obligatoire(row: LigneCsv, champs: string[]): void {
    if (champs.some((champ) => !row[champ]?.trim())) {
      throw new BadRequestException(
        `Champs obligatoires : ${champs.join(', ')}`,
      );
    }
  }

  private entier(valeur: string, nom: string): number {
    if (!/^[1-9]\d*$/.test(valeur))
      throw new BadRequestException(`${nom} doit être un entier positif`);
    const result = Number(valeur);
    if (!Number.isSafeInteger(result))
      throw new BadRequestException(`${nom} hors limite`);
    return result;
  }

  private cleImport(type: TypeImportAcademique, row: LigneCsv): string {
    switch (type) {
      case 'ue':
        return `ue:${row.code.toLowerCase()}`;
      case 'etudiants':
      case 'enseignants':
        return `${type}:${row.matricule.toLowerCase()}`;
      case 'offres':
        return `offre:${row.uecode}:${row.programid}:${row.anneeuniversitaire}:${row.semestre}`;
      case 'affectations':
      case 'inscriptions':
        return `${type}:${row.courseid}:${row.matricule.toLowerCase()}`;
      case 'delegues':
        return `delegue:${row.programid}:${row.anneeuniversitaire}:${row.type}`;
    }
  }
}
