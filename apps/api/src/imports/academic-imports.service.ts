import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { DatabaseQuery, DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

export type TypeImportAcademique =
  | 'etudiants'
  | 'enseignants'
  | 'ue'
  | 'offres'
  | 'affectations'
  | 'inscriptions'
  | 'delegues'
  | 'catalogue'
  | 'presences';

export interface ContexteImport {
  campus?: string;
  departement?: string;
  programme?: string;
  anneeUniversitaire?: string;
}

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
  offres: [
    'uecode',
    'campus',
    'departement',
    'programme',
    'anneeuniversitaire',
    'semestre',
  ],
  affectations: [
    'uecode',
    'campus',
    'departement',
    'programme',
    'anneeuniversitaire',
    'semestre',
    'matricule',
  ],
  inscriptions: [
    'uecode',
    'campus',
    'departement',
    'programme',
    'anneeuniversitaire',
    'semestre',
    'matricule',
  ],
  catalogue: [],
  presences: [],
  delegues: [
    'campus',
    'departement',
    'programme',
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

function texteCellule(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'object') return '';
  if ('result' in value) return texteCellule(value.result);
  if ('text' in value) return texteCellule(value.text);
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part) =>
        typeof part === 'object' && part !== null && 'text' in part
          ? texteCellule(part.text)
          : '',
      )
      .join('');
  }
  return '';
}

function normaliserEntete(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
    nomFichier = '',
    contexte: ContexteImport = {},
  ) {
    let records: (string[] | LigneCsv)[];
    let warnings: ErreurLigne[] = [];
    if (nomFichier.toLowerCase().endsWith('.xlsx')) {
      if (type !== 'catalogue' && type !== 'presences') {
        throw new BadRequestException(
          'Les classeurs XLSX sont pris en charge uniquement pour le catalogue et les présences',
        );
      }
      const workbook = new ExcelJS.Workbook();
      try {
        const workbookBytes = new ArrayBuffer(contenu.byteLength);
        new Uint8Array(workbookBytes).set(contenu);
        await workbook.xlsx.load(workbookBytes);
      } catch {
        throw new BadRequestException('Classeur XLSX invalide ou illisible');
      }
      records =
        type === 'catalogue'
          ? this.lireCatalogue(workbook, contexte)
          : this.lirePresences(workbook, contexte);
    } else {
      if (type === 'catalogue' || type === 'presences') {
        throw new BadRequestException(
          'Ce type d’import exige le classeur XLSX fourni par l’établissement',
        );
      }
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
    }
    if (records.length === 0)
      throw new BadRequestException('Le fichier CSV est vide');
    if (records.length > 2001)
      throw new BadRequestException('Maximum 2 000 lignes par import');

    const headers =
      type === 'catalogue' || type === 'presences'
        ? undefined
        : (records.shift() as string[] | undefined)?.map((header) =>
            header.toLowerCase(),
          );
    const expected = COLONNES[type];
    if (
      type !== 'catalogue' &&
      type !== 'presences' &&
      (!headers ||
        headers.length !== expected.length ||
        headers.some((header, index) => header !== expected[index]))
    ) {
      throw new BadRequestException(
        `En-têtes attendus : ${expected.join(', ')}`,
      );
    }

    const validRows: LigneCsv[] = [];
    const errors: ErreurLigne[] = [];
    const deduplication = new Set<string>();
    for (const [index, values] of records.entries()) {
      const row = Array.isArray(values)
        ? Object.fromEntries(
            headers!.map((header, column) => [header, values[column] ?? '']),
          )
        : values;
      try {
        await this.validerLigne(type, row, campusId);
        const key = this.cleImport(type, row);
        if (deduplication.has(key)) {
          throw new BadRequestException('Ligne dupliquée dans le fichier');
        }
        deduplication.add(key);
        validRows.push(row);
        const warning = await this.avertissementLigne(type, row);
        if (warning) {
          warnings.push({
            ligne: Number(row.__ligne) || index + 1,
            message: warning,
          });
        }
      } catch (error) {
        errors.push({
          ligne: Number(row.__ligne) || index + (type === 'catalogue' ? 3 : 2),
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
      avertissements: warnings,
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
          userId,
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

  private lireCatalogue(
    workbook: ExcelJS.Workbook,
    contexte: ContexteImport,
  ): LigneCsv[] {
    const sheet = workbook.getWorksheet('Format 2');
    if (!sheet) {
      throw new BadRequestException(
        'Le classeur doit contenir la feuille « Format 2 »',
      );
    }
    const headers = Array.from({ length: 10 }, (_, index) =>
      normaliserEntete(texteCellule(sheet.getRow(2).getCell(index + 1).value)),
    );
    const expected = [
      'code',
      'intitules',
      'credits',
      'pre requis',
      'sem evol',
      'sem etude',
      'option',
      'enseignant',
      'contacts',
      'emails',
    ];
    if (
      headers.length !== expected.length ||
      headers.some((value, index) => value !== expected[index])
    ) {
      throw new BadRequestException(
        'La feuille « Format 2 » ne respecte pas le modèle de catalogue attendu',
      );
    }
    const entete = texteCellule(sheet.getRow(1).getCell(3).value);
    const yearFromWorkbook = entete.match(/\b\d{4}-\d{4}\b/)?.[0] ?? '';
    const campus = contexte.campus?.trim() ?? '';
    const departement = contexte.departement?.trim() ?? '';
    const programme = contexte.programme?.trim() ?? '';
    const anneeuniversitaire =
      contexte.anneeUniversitaire?.trim() || yearFromWorkbook;
    if (
      !campus ||
      !departement ||
      !programme ||
      !ANNEE.test(anneeuniversitaire)
    ) {
      throw new BadRequestException(
        'Campus, département, programme et année universitaire sont requis pour importer ce catalogue',
      );
    }

    const rows: LigneCsv[] = [];
    for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber++) {
      const excelRow = sheet.getRow(rowNumber);
      const values = Array.from({ length: 10 }, (_, index) =>
        texteCellule(excelRow.getCell(index + 1).value),
      );
      if (values.every((value) => !value)) continue;
      rows.push({
        __ligne: String(rowNumber),
        code: values[0],
        intitule: values[1],
        credits: values[2],
        prerequis: values[3],
        semestre: values[4],
        annee_etude: values[5],
        option: values[6],
        enseignant: values[7],
        telephone: values[8],
        email: values[9],
        campus,
        departement,
        programme,
        anneeuniversitaire,
      });
    }
    return rows;
  }

  private lirePresences(
    workbook: ExcelJS.Workbook,
    contexte: ContexteImport,
  ): LigneCsv[] {
    const settings = workbook.getWorksheet('Paramètres');
    const sheet = workbook.getWorksheet('Présence');
    if (!settings || !sheet) {
      throw new BadRequestException(
        'Le classeur doit contenir les feuilles « Paramètres » et « Présence »',
      );
    }
    const courseTitle = texteCellule(settings.getRow(9).getCell(3).value);
    const courseCode = courseTitle.match(
      /\(([A-Za-z0-9][A-Za-z0-9._-]{1,49})\)/,
    )?.[1];
    if (!courseCode) {
      throw new BadRequestException(
        'Ajoutez le code UE entre parenthèses dans l’intitulé du cours (ex. : Physique (2PHY1120))',
      );
    }
    const academicYear = texteCellule(settings.getRow(6).getCell(3).value);
    const semesterLabel = texteCellule(settings.getRow(7).getCell(3).value);
    const semester = semesterLabel.match(/\d+/)?.[0] ?? '';
    const campus = contexte.campus?.trim() ?? '';
    const departement = contexte.departement?.trim() ?? '';
    const programme = contexte.programme?.trim() ?? '';
    if (
      !campus ||
      !departement ||
      !programme ||
      !ANNEE.test(academicYear) ||
      !semester
    ) {
      throw new BadRequestException(
        'Campus, département, programme et informations d’année/semestre du classeur sont requis',
      );
    }

    const etudiants: { matricule: string; nom: string; ligne: number }[] = [];
    const matricules = new Set<string>();
    for (let rowNumber = 9; rowNumber <= sheet.rowCount; rowNumber++) {
      const excelRow = sheet.getRow(rowNumber);
      const ligneCalculee = Array.from({ length: 28 }, (_, index) => {
        const value = excelRow.getCell(index + 4).value;
        return (
          typeof value === 'object' && value !== null && 'formula' in value
        );
      }).some(Boolean);
      if (ligneCalculee) continue;
      const matricule = texteCellule(excelRow.getCell(1).value);
      const nom = texteCellule(excelRow.getCell(2).value);
      const footerText = [
        nom,
        ...Array.from({ length: 28 }, (_, index) =>
          texteCellule(excelRow.getCell(index + 4).value),
        ),
      ]
        .map(normaliserEntete)
        .join(' ');
      if (!matricule && /(signature|visa|date de cloture)/.test(footerText)) {
        continue;
      }
      if (!matricule && !nom) continue;
      if (!matricule || !nom) {
        throw new BadRequestException(
          `Matricule ou nom manquant à la ligne ${rowNumber} de la feuille « Présence »`,
        );
      }
      const key = matricule.toLowerCase();
      if (matricules.has(key)) {
        throw new BadRequestException(
          `Matricule dupliqué à la ligne ${rowNumber} : ${matricule}`,
        );
      }
      matricules.add(key);
      etudiants.push({ matricule, nom, ligne: rowNumber });
    }
    if (etudiants.length === 0) {
      throw new BadRequestException(
        'La feuille « Présence » ne contient aucun étudiant',
      );
    }

    const rows: LigneCsv[] = [];
    for (let column = 4; column <= 31; column++) {
      const date = texteCellule(sheet.getRow(8).getCell(column).value);
      if (!dateValide(date.slice(0, 10))) {
        throw new BadRequestException(
          `Date invalide dans la colonne ${column} de la feuille « Présence »`,
        );
      }
      const entries = etudiants.map((etudiant) => {
        const excelRow = sheet.getRow(etudiant.ligne);
        const code = texteCellule(excelRow.getCell(column).value).toUpperCase();
        const statuts: Record<string, string> = {
          P: 'present',
          R: 'retard',
          A: 'absent',
          J: 'justifie',
        };
        if (code && !statuts[code]) {
          throw new BadRequestException(
            `Code de présence « ${code} » invalide à la ligne ${etudiant.ligne}, colonne ${column}`,
          );
        }
        return {
          matricule: etudiant.matricule,
          statut: code ? statuts[code] : '',
        };
      });
      const week = texteCellule(sheet.getRow(7).getCell(column).value);
      const special = texteCellule(sheet.getRow(5).getCell(column).value);
      rows.push({
        __ligne: String(8),
        uecode: courseCode,
        campus,
        departement,
        programme,
        anneeuniversitaire: academicYear,
        semestre: semester,
        date: date.slice(0, 10),
        libelle: special || `${week} ${column % 2 === 0 ? 'a' : 'b'}`,
        presences: JSON.stringify(entries),
      });
    }
    return rows;
  }

  private async avertissementLigne(
    type: TypeImportAcademique,
    row: LigneCsv,
  ): Promise<string | undefined> {
    if (type !== 'catalogue' || (!row.enseignant && !row.email)) {
      return undefined;
    }
    if (!row.email) {
      return `Aucun email pour ${row.enseignant}; aucune affectation d’enseignant ne sera créée`;
    }
    const teachers = await this.db.query<{ id: number }>(
      `SELECT u.id
       FROM identity.users u
       JOIN identity.user_roles r ON r.user_id = u.id AND r.role = 'enseignant'
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [row.email],
    );
    return teachers.length
      ? undefined
      : `Aucun compte enseignant correspondant à ${row.email}; aucun compte ne sera créé`;
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

    if (type === 'catalogue') {
      this.obligatoire(row, [
        'code',
        'intitule',
        'credits',
        'semestre',
        'annee_etude',
        'campus',
        'departement',
        'programme',
        'anneeuniversitaire',
      ]);
      if (
        row.code.length > 50 ||
        row.intitule.length > 300 ||
        !/^[1-9]\d*$/.test(row.credits) ||
        !ANNEE.test(row.anneeuniversitaire)
      ) {
        throw new BadRequestException(
          'Code, intitulé, crédits ou année universitaire invalides',
        );
      }
      const semester = this.entier(row.semestre, 'semestre');
      const studyYear = this.entier(row.annee_etude, 'année d’étude');
      if (semester > 10 || studyYear > 10) {
        throw new BadRequestException(
          'Le semestre et l’année d’étude doivent être compris entre 1 et 10',
        );
      }
      if (campusId !== null) {
        const campus = await this.db.query<{ id: number }>(
          `SELECT id FROM ref.campus
           WHERE id = $1 AND LOWER(BTRIM(nom)) = LOWER(BTRIM($2))`,
          [campusId, row.campus],
        );
        if (!campus.length) {
          throw new BadRequestException(
            'Le campus indiqué ne correspond pas à votre périmètre Scolarité',
          );
        }
      }
      await this.verifierAnneeNonArchivee(row.anneeuniversitaire);
      return;
    }

    if (type === 'presences') {
      this.obligatoire(row, [
        'uecode',
        'campus',
        'departement',
        'programme',
        'anneeuniversitaire',
        'semestre',
        'date',
        'libelle',
        'presences',
      ]);
      if (!ANNEE.test(row.anneeuniversitaire) || !dateValide(row.date)) {
        throw new BadRequestException(
          'Année universitaire ou date de séance invalide',
        );
      }
      const semester = this.entier(row.semestre, 'semestre');
      if (semester > 10) {
        throw new BadRequestException('Semestre invalide');
      }
      const courseId = await this.trouverCoursId(
        this.db.query.bind(this.db),
        row,
        campusId,
      );
      let presences: { matricule: string; statut: string }[];
      try {
        presences = JSON.parse(row.presences) as {
          matricule: string;
          statut: string;
        }[];
      } catch {
        throw new BadRequestException('Liste de présences invalide');
      }
      if (
        presences.length === 0 ||
        presences.some(
          (presence) =>
            !presence.matricule ||
            !['', 'present', 'absent', 'retard', 'justifie'].includes(
              presence.statut,
            ),
        )
      ) {
        throw new BadRequestException('Matricule ou code de présence invalide');
      }
      const admissibles = await this.db.query<{ count: number }>(
        `WITH saisies AS (
           SELECT matricule
           FROM jsonb_to_recordset($1::jsonb) AS item(matricule text, statut text)
         )
         SELECT count(DISTINCT u.id)::int AS count
         FROM saisies s
         JOIN identity.users u ON LOWER(u.matricule) = LOWER(s.matricule)
         JOIN ref.enrollment e
           ON e.student_id = u.id AND e.course_id = $2`,
        [JSON.stringify(presences), courseId],
      );
      if (admissibles[0]?.count !== presences.length) {
        throw new BadRequestException(
          'Un ou plusieurs matricules ne sont pas inscrits à cette UE',
        );
      }
      await this.verifierAnneeNonArchivee(row.anneeuniversitaire);
      return;
    }

    if (type === 'offres') {
      this.obligatoire(row, [
        'uecode',
        'campus',
        'departement',
        'programme',
        'anneeuniversitaire',
        'semestre',
      ]);
      const semester = this.entier(row.semestre, 'semestre');
      if (!ANNEE.test(row.anneeuniversitaire) || semester > 10) {
        throw new BadRequestException(
          'Année universitaire ou semestre invalide',
        );
      }
      await this.trouverUeId(this.db.query.bind(this.db), row.uecode);
      await this.trouverProgrammeId(this.db.query.bind(this.db), row, campusId);
      await this.verifierAnneeNonArchivee(row.anneeuniversitaire);
      return;
    }

    if (type === 'affectations' || type === 'inscriptions') {
      this.obligatoire(row, [
        'uecode',
        'campus',
        'departement',
        'programme',
        'anneeuniversitaire',
        'semestre',
        'matricule',
      ]);
      const semester = this.entier(row.semestre, 'semestre');
      if (!ANNEE.test(row.anneeuniversitaire) || semester > 10) {
        throw new BadRequestException(
          'Année universitaire ou semestre invalide',
        );
      }
      const courseId = await this.trouverCoursId(
        this.db.query.bind(this.db),
        row,
        campusId,
      );
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
      'campus',
      'departement',
      'programme',
      'matricule',
      'anneeuniversitaire',
      'type',
      'debut',
      'fin',
    ]);
    const programId = await this.trouverProgrammeId(
      this.db.query.bind(this.db),
      row,
      campusId,
    );
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

  private async obtenirProgrammeCible(
    query: DatabaseQuery,
    row: LigneCsv,
    campusId: number | null,
  ): Promise<{ campusId: number; departmentId: number; programId: number }> {
    let campusRows: { id: number }[];
    if (campusId !== null) {
      campusRows = await query<{ id: number }>(
        `SELECT id FROM ref.campus
         WHERE id = $1 AND LOWER(BTRIM(nom)) = LOWER(BTRIM($2))`,
        [campusId, row.campus],
      );
      if (!campusRows[0]) {
        throw new BadRequestException(
          'Le campus indiqué ne correspond pas à votre périmètre Scolarité',
        );
      }
    } else {
      campusRows = await query<{ id: number }>(
        `INSERT INTO ref.campus (nom)
         VALUES ($1)
         ON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom
         RETURNING id`,
        [row.campus],
      );
    }
    const targetCampusId = campusRows[0].id;
    const departments = await query<{ id: number }>(
      `INSERT INTO ref.department (campus_id, nom)
       VALUES ($1, $2)
       ON CONFLICT (campus_id, nom) DO UPDATE SET nom = EXCLUDED.nom
       RETURNING id`,
      [targetCampusId, row.departement],
    );
    const departmentId = departments[0].id;
    const programs = await query<{ id: number }>(
      `INSERT INTO ref.program (department_id, nom)
       VALUES ($1, $2)
       ON CONFLICT (department_id, nom) DO UPDATE SET nom = EXCLUDED.nom
       RETURNING id`,
      [departmentId, row.programme],
    );
    return {
      campusId: targetCampusId,
      departmentId,
      programId: programs[0].id,
    };
  }

  private async appliquer(
    query: DatabaseQuery,
    type: TypeImportAcademique,
    row: LigneCsv,
    campusId: number | null,
    userId: number,
  ): Promise<{ cree: boolean; modifie: boolean }> {
    if (type === 'catalogue') {
      const { campusId: targetCampusId, programId } =
        await this.obtenirProgrammeCible(query, row, campusId);
      const ues = await query<{ id: number; cree: boolean }>(
        `INSERT INTO ref.ue (code, intitule, credits, prerequis, option)
         VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''))
         ON CONFLICT (code) DO UPDATE
         SET intitule = EXCLUDED.intitule,
             credits = EXCLUDED.credits,
             prerequis = EXCLUDED.prerequis,
             option = EXCLUDED.option
         RETURNING id, (xmax = 0) AS cree`,
        [
          row.code,
          row.intitule,
          Number(row.credits),
          row.prerequis,
          row.option,
        ],
      );
      const courses = await query<{ id: number; cree: boolean }>(
        `INSERT INTO ref.course
           (ue_id, program_id, annee_universitaire, semestre, annee_etude)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (
           SELECT 1 FROM academic.annual_archives
           WHERE annee_universitaire = $3
         )
         ON CONFLICT (ue_id, program_id, annee_universitaire, semestre)
         DO UPDATE SET annee_etude = EXCLUDED.annee_etude
         RETURNING id, (xmax = 0) AS cree`,
        [
          ues[0].id,
          programId,
          row.anneeuniversitaire,
          Number(row.semestre),
          Number(row.annee_etude),
        ],
      );
      if (!courses[0]) {
        throw new BadRequestException(
          'Offre de cours non créée : année archivée ou référentiel modifié',
        );
      }
      const teachers = row.email
        ? await query<{ id: number }>(
            `SELECT u.id
             FROM identity.users u
             JOIN identity.user_roles r
               ON r.user_id = u.id AND r.role = 'enseignant'
             WHERE LOWER(u.email) = LOWER($1)
               AND (r.campus_id IS NULL OR r.campus_id = $2)
             LIMIT 1`,
            [row.email, targetCampusId],
          )
        : [];
      const teacherId = teachers[0]?.id ?? null;
      if (teacherId !== null) {
        await query(
          `INSERT INTO ref.course_teacher (course_id, teacher_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [courses[0].id, teacherId],
        );
      }
      if (row.enseignant || row.telephone || row.email) {
        await query(
          `INSERT INTO ref.course_contacts
             (course_id, teacher_id, enseignant, telephone, email)
           VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
           ON CONFLICT DO NOTHING`,
          [
            courses[0].id,
            teacherId,
            row.enseignant,
            row.telephone,
            row.email.toLowerCase(),
          ],
        );
      }
      const cree = ues[0].cree || courses[0].cree;
      return { cree, modifie: !cree };
    }

    if (type === 'presences') {
      const courseId = await this.trouverCoursId(query, row, campusId);
      await query('SELECT pg_advisory_xact_lock($1::int, hashtext($2)::int)', [
        courseId,
        row.date,
      ]);
      const sessions = await query<{ id: number }>(
        `SELECT id FROM academic.attendance_sessions
         WHERE course_id = $1 AND date = $2::date
         ORDER BY id
         FOR UPDATE`,
        [courseId, row.date],
      );
      if (sessions.length > 1) {
        throw new BadRequestException(
          `Plusieurs séances existent déjà pour le ${row.date}; import annulé pour éviter un doublon`,
        );
      }
      const sessionCreated = sessions.length === 0;
      const session = sessionCreated
        ? await query<{ id: number }>(
            `INSERT INTO academic.attendance_sessions
               (course_id, created_by, date, libelle)
             VALUES ($1, $2, $3::date, $4)
             RETURNING id`,
            [courseId, userId, row.date, row.libelle],
          )
        : sessions;
      let entries: { matricule: string; statut: string }[];
      try {
        entries = JSON.parse(row.presences) as {
          matricule: string;
          statut: string;
        }[];
      } catch {
        throw new BadRequestException('Liste de présences invalide');
      }
      const saved = await query<{ cree: boolean }>(
        `WITH saisies AS (
           SELECT item.matricule, item.statut, u.id AS student_id
           FROM jsonb_to_recordset($1::jsonb)
             AS item(matricule text, statut text)
           JOIN identity.users u
             ON LOWER(u.matricule) = LOWER(item.matricule)
           WHERE item.statut <> ''
         ), enregistrees AS (
           INSERT INTO academic.attendance_records
             (session_id, course_id, student_id, statut, updated_by)
           SELECT $2, $3, student_id, statut, $4
           FROM saisies
           ON CONFLICT (session_id, student_id)
           DO UPDATE SET statut = EXCLUDED.statut,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()
           RETURNING (xmax = 0) AS cree
         )
         SELECT cree FROM enregistrees`,
        [JSON.stringify(entries), session[0].id, courseId, userId],
      );
      const cree = sessionCreated || saved.some((entry) => entry.cree);
      const modifie = !sessionCreated && saved.some((entry) => !entry.cree);
      return { cree, modifie };
    }

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
      const ueId = await this.trouverUeId(query, row.uecode);
      const programId = await this.trouverProgrammeId(query, row, campusId);
      const rows = await query<{ cree: boolean }>(
        `INSERT INTO ref.course (ue_id, program_id, annee_universitaire, semestre)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (
             SELECT 1 FROM academic.annual_archives a
             WHERE a.annee_universitaire = $3
           )
         ON CONFLICT (ue_id, program_id, annee_universitaire, semestre)
         DO UPDATE SET semestre = EXCLUDED.semestre
         RETURNING (xmax = 0) AS cree`,
        [ueId, programId, row.anneeuniversitaire, Number(row.semestre)],
      );
      if (!rows[0])
        throw new BadRequestException(
          'Offre de cours non créée : année archivée ou référentiel modifié',
        );
      return { cree: rows[0].cree, modifie: !rows[0].cree };
    }
    if (type === 'inscriptions' || type === 'affectations') {
      const courseId = await this.trouverCoursId(query, row, campusId);
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
        [courseId, row.matricule, role, campusId],
      );
      return { cree: rows.length > 0, modifie: false };
    }

    const programId = await this.trouverProgrammeId(query, row, campusId);
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
        programId,
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
      [programId, row.anneeuniversitaire, mandates[0].student_id],
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

  private async trouverProgrammeId(
    query: DatabaseQuery,
    row: LigneCsv,
    campusId: number | null,
  ): Promise<number> {
    const rows = await query<{ id: number }>(
      `SELECT p.id
       FROM ref.program p
       JOIN ref.department d ON d.id = p.department_id
       JOIN ref.campus c ON c.id = d.campus_id
       WHERE LOWER(BTRIM(c.nom)) = LOWER(BTRIM($1))
         AND LOWER(BTRIM(d.nom)) = LOWER(BTRIM($2))
         AND LOWER(BTRIM(p.nom)) = LOWER(BTRIM($3))
         AND ($4::int IS NULL OR c.id = $4)
       LIMIT 2`,
      [row.campus, row.departement, row.programme, campusId],
    );
    if (rows.length === 0) {
      throw new BadRequestException(
        'Campus, département ou programme introuvable dans votre périmètre',
      );
    }
    if (rows.length > 1) {
      throw new BadRequestException(
        'Campus, département et programme ne désignent pas un référentiel unique',
      );
    }
    return rows[0].id;
  }

  private async trouverUeId(
    query: DatabaseQuery,
    code: string,
  ): Promise<number> {
    const rows = await query<{ id: number }>(
      `SELECT id FROM ref.ue
       WHERE LOWER(BTRIM(code)) = LOWER(BTRIM($1))
       LIMIT 2`,
      [code],
    );
    if (rows.length !== 1) {
      throw new BadRequestException(
        rows.length === 0
          ? `Code UE introuvable : ${code}`
          : `Code UE ambigu : ${code}`,
      );
    }
    return rows[0].id;
  }

  private async trouverCoursId(
    query: DatabaseQuery,
    row: LigneCsv,
    campusId: number | null,
  ): Promise<number> {
    const rows = await query<{ id: number }>(
      `SELECT co.id
       FROM ref.course co
       JOIN ref.ue u ON u.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN ref.department d ON d.id = p.department_id
       JOIN ref.campus c ON c.id = d.campus_id
       WHERE LOWER(BTRIM(u.code)) = LOWER(BTRIM($1))
         AND LOWER(BTRIM(c.nom)) = LOWER(BTRIM($2))
         AND LOWER(BTRIM(d.nom)) = LOWER(BTRIM($3))
         AND LOWER(BTRIM(p.nom)) = LOWER(BTRIM($4))
         AND co.annee_universitaire = $5
         AND co.semestre = $6
         AND ($7::int IS NULL OR c.id = $7)
       LIMIT 2`,
      [
        row.uecode,
        row.campus,
        row.departement,
        row.programme,
        row.anneeuniversitaire,
        Number(row.semestre),
        campusId,
      ],
    );
    if (rows.length === 0) {
      throw new BadRequestException(
        'Offre UE/programme/année/semestre introuvable dans votre périmètre',
      );
    }
    if (rows.length > 1) {
      throw new BadRequestException(
        'Les informations de l’offre ne désignent pas un cours unique',
      );
    }
    return rows[0].id;
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
      case 'catalogue':
        return `catalogue:${row.code.toLowerCase()}`;
      case 'presences':
        return `presence:${row.uecode.toLowerCase()}:${row.date}`;
      case 'ue':
        return `ue:${row.code.toLowerCase()}`;
      case 'etudiants':
      case 'enseignants':
        return `${type}:${row.matricule.toLowerCase()}`;
      case 'offres':
        return [
          'offre',
          row.uecode,
          row.campus,
          row.departement,
          row.programme,
          row.anneeuniversitaire,
          row.semestre,
        ]
          .map((part) => part.toLowerCase())
          .join(':');
      case 'affectations':
      case 'inscriptions':
        return [
          type,
          row.uecode,
          row.campus,
          row.departement,
          row.programme,
          row.anneeuniversitaire,
          row.semestre,
          row.matricule,
        ]
          .map((part) => part.toLowerCase())
          .join(':');
      case 'delegues':
        return [
          'delegue',
          row.campus,
          row.departement,
          row.programme,
          row.anneeuniversitaire,
          row.type,
        ]
          .map((part) => part.toLowerCase())
          .join(':');
    }
  }
}
