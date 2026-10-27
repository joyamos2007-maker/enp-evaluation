import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { parse } from 'csv-parse/sync';

interface ImportLigne {
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  role: ImportRole;
  campusId: number | null;
  departmentId: number | null;
}

export interface ErreurImport {
  ligne: number;
  erreur: string;
}

type ImportRole =
  | 'etudiant'
  | 'delegue'
  | 'enseignant'
  | 'chef_departement'
  | 'scolarite'
  | 'direction_etudes'
  | 'admin';

const ENTETES = ['matricule', 'email', 'nom', 'prenom', 'role'];
const ENTETES_OPTIONNELLES = ['campusid', 'departmentid'];
const ROLES: ImportRole[] = [
  'etudiant',
  'delegue',
  'enseignant',
  'chef_departement',
  'scolarite',
  'direction_etudes',
  'admin',
];

@Injectable()
export class ImportsService {
  constructor(private readonly db: DatabaseService) {}

  async importUsers(fileBuffer: Buffer, campusId: number | null = null, operatorRoles: string[] = ['admin']) {
    let records: string[][];
    try {
      records = parse(fileBuffer, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: false,
      }) as string[][];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Format CSV invalide';
      throw new BadRequestException('Fichier CSV invalide : ' + message);
    }
    const entetes = records.shift()?.map((entete) => entete.toLowerCase());
    if (
      !entetes ||
      entetes.length < ENTETES.length ||
      entetes.length > ENTETES.length + ENTETES_OPTIONNELLES.length ||
      ENTETES.some((entete, index) => entetes[index] !== entete) ||
      ENTETES_OPTIONNELLES.some(
        (entete, index) => entetes.length > ENTETES.length + index && entetes[ENTETES.length + index] !== entete,
      )
    ) {
      throw new BadRequestException(
        'En-têtes CSV attendus : ' + ENTETES.join(', ') + ' (campusId, departmentId facultatifs, dans cet ordre)',
      );
    }

    const report = {
      totalRows: records.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as ErreurImport[],
    };

    for (const [index, valeurs] of records.entries()) {
      try {
        const row = validerLigne({
          matricule: valeurs[0] ?? '',
          email: valeurs[1] ?? '',
          nom: valeurs[2] ?? '',
          prenom: valeurs[3] ?? '',
          role: valeurs[4] ?? '',
          campusId: valeurs[5] ?? '',
          departmentId: valeurs[6] ?? '',
        });
        if (
          operatorRoles.includes('scolarite') &&
          !operatorRoles.includes('admin') &&
          !['etudiant', 'delegue', 'enseignant'].includes(row.role)
        ) {
          throw new BadRequestException('Le service Scolarité ne peut importer que des comptes étudiants, délégués ou enseignants');
        }
        if (
          operatorRoles.includes('scolarite') &&
          !operatorRoles.includes('admin') &&
          row.campusId !== null &&
          row.campusId !== campusId
        ) {
          throw new BadRequestException('Le campus indiqué ne correspond pas au périmètre du service Scolarité');
        }
        const campusAffectation = operatorRoles.includes('scolarite') && !operatorRoles.includes('admin')
          ? campusId
          : row.campusId;
        const departmentAffectation = row.departmentId;
        let campusFinal = campusAffectation;
        if (departmentAffectation !== null) {
          const departements = await this.db.query<{ campus_id: number }>(
            `SELECT campus_id FROM ref.department
             WHERE id = $1 AND ($2::int IS NULL OR campus_id = $2)`,
            [departmentAffectation, campusAffectation],
          );
          if (departements.length === 0) {
            throw new BadRequestException('Département introuvable ou hors du campus autorisé');
          }
          campusFinal ??= departements[0].campus_id;
        }
        if (row.role === 'scolarite' && campusFinal === null) {
          throw new BadRequestException('Un compte Scolarité doit être rattaché à un campus');
        }
        if (row.role === 'chef_departement' && departmentAffectation === null) {
          throw new BadRequestException('Un Chef de département doit être rattaché à un département');
        }
        if (
          ['direction_etudes', 'admin'].includes(row.role) &&
          (campusFinal !== null || departmentAffectation !== null)
        ) {
          throw new BadRequestException('Les rôles globaux ne peuvent pas être rattachés à un campus ou département');
        }
        if (row.role === 'scolarite' && departmentAffectation !== null) {
          throw new BadRequestException('Le rôle Scolarité est rattaché au campus, pas à un département');
        }
        await this.db.query(
          `WITH compte AS (
             INSERT INTO identity.users (matricule, email, nom, prenom, actif)
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT (matricule) DO UPDATE
               SET email = EXCLUDED.email, nom = EXCLUDED.nom, prenom = EXCLUDED.prenom
             RETURNING id
           )
           INSERT INTO identity.user_roles (user_id, role, campus_id, department_id)
           SELECT id, $5, $6, $7 FROM compte
           ON CONFLICT (user_id, role) DO UPDATE
             SET campus_id = COALESCE(identity.user_roles.campus_id, EXCLUDED.campus_id),
                 department_id = COALESCE(identity.user_roles.department_id, EXCLUDED.department_id)`,
          [
            row.matricule,
            row.email,
            row.nom,
            row.prenom,
            row.role,
            campusFinal,
            departmentAffectation,
          ],
        );
        report.successCount++;
      } catch (err) {
        report.errorCount++;
        report.errors.push({
          ligne: index + 2,
          erreur: err instanceof Error ? err.message : 'Erreur lors de l’import de cette ligne.',
        });
      }
    }

    return report;
  }
}

function validerLigne(record: Record<'matricule' | 'email' | 'nom' | 'prenom' | 'role', string> & {
  campusId: string;
  departmentId: string;
}): ImportLigne {
  const matricule = record.matricule.trim();
  const email = record.email.trim().toLowerCase();
  const nom = record.nom.trim();
  const prenom = record.prenom.trim();
  const role = record.role.trim().toLowerCase();

  if (!matricule || matricule.length > 30) {
    throw new BadRequestException('matricule obligatoire (30 caractères maximum)');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('adresse email invalide');
  }
  if (!nom || nom.length > 100 || !prenom || prenom.length > 100) {
    throw new BadRequestException('nom et prénom obligatoires (100 caractères maximum)');
  }
  if (!estRole(role)) {
    throw new BadRequestException('role invalide : ' + ROLES.join(', '));
  }

  return {
    matricule,
    email,
    nom,
    prenom,
    role,
    campusId: lirePerimetre(record.campusId, 'campusId'),
    departmentId: lirePerimetre(record.departmentId, 'departmentId'),
  };
}

function lirePerimetre(valeur: string, champ: string): number | null {
  if (!valeur.trim()) return null;
  if (!/^[1-9]\d*$/.test(valeur.trim())) {
    throw new BadRequestException(champ + ' doit être un entier positif');
  }
  const id = Number(valeur);
  if (!Number.isSafeInteger(id)) throw new BadRequestException(champ + ' doit être un entier positif');
  return id;
}

function estRole(role: string): role is ImportRole {
  return ROLES.some((roleAutorise) => roleAutorise === role);
}