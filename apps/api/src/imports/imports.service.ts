import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { parse } from 'csv-parse/sync';
import { IdentityService } from '../auth/identity.service';

interface ImportLigne {
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  role: ImportRole;
  campus: string | null;
  departement: string | null;
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
  | 'directeur_campus'
  | 'directeur_general'
  | 'admin';

const ENTETES = ['matricule', 'email', 'nom', 'prenom', 'role'];
const ENTETES_OPTIONNELLES = ['campus', 'departement'];
const ROLES: ImportRole[] = [
  'etudiant',
  'delegue',
  'enseignant',
  'chef_departement',
  'scolarite',
  'directeur_campus',
  'directeur_general',
  'admin',
];

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityService,
  ) {}

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
        'En-têtes CSV attendus : ' + ENTETES.join(', ') + ' (campus, departement facultatifs, dans cet ordre)',
      );
    }

    const report = {
      totalRows: records.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as ErreurImport[],
      courrielsActivationEnfiles: 0,
      erreurActivation: undefined as string | undefined,
    };
    const comptesImportes: string[] = [];

    for (const [index, valeurs] of records.entries()) {
      try {
        const row = validerLigne({
          matricule: valeurs[0] ?? '',
          email: valeurs[1] ?? '',
          nom: valeurs[2] ?? '',
          prenom: valeurs[3] ?? '',
          role: valeurs[4] ?? '',
          campus: valeurs[5] ?? '',
          departement: valeurs[6] ?? '',
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
          row.campus !== null &&
          (await this.trouverCampus(row.campus)) !== campusId
        ) {
          throw new BadRequestException('Le campus indiqué ne correspond pas au périmètre du service Scolarité');
        }
        const campusAffectation =
          operatorRoles.includes('scolarite') && !operatorRoles.includes('admin')
            ? campusId
            : row.campus
              ? await this.trouverCampus(row.campus)
              : null;
        const departement = row.departement
          ? await this.trouverDepartement(row.departement, campusAffectation)
          : null;
        const departmentAffectation = departement?.id ?? null;
        const campusFinal = campusAffectation ?? departement?.campus_id ?? null;
        if (row.role === 'scolarite' && campusFinal === null) {
          throw new BadRequestException('Un compte Scolarité doit être rattaché à un campus');
        }
        if (row.role === 'directeur_campus' && campusFinal === null) {
          throw new BadRequestException('Un Directeur de campus doit être rattaché à un campus');
        }
        if (row.role === 'chef_departement' && departmentAffectation === null) {
          throw new BadRequestException('Un Chef de département doit être rattaché à un département');
        }
        if (
          ['directeur_general', 'admin'].includes(row.role) &&
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
        comptesImportes.push(row.matricule);
        report.successCount++;
      } catch (err) {
        report.errorCount++;
        report.errors.push({
          ligne: index + 2,
          erreur: err instanceof Error ? err.message : 'Erreur lors de l’import de cette ligne.',
        });
      }
    }

    for (let debut = 0; debut < comptesImportes.length; debut += 500) {
      try {
        const resultatCodes = await this.identity.genererCodesActivation(
          campusId,
          { identifiants: comptesImportes.slice(debut, debut + 500) },
        );
        report.courrielsActivationEnfiles += resultatCodes.courrielsEnfiles;
      } catch (error) {
        this.logger.error(
          'Les comptes ont été importés, mais la mise en file des courriels d’activation a échoué',
          error instanceof Error ? error.stack : String(error),
        );
        report.erreurActivation =
          'Les comptes ont été importés, mais la mise en file des courriels d’activation a échoué. Vous pouvez réessayer depuis la liste des comptes.';
        break;
      }
    }

    return report;
  }

  private async trouverCampus(nom: string): Promise<number> {
    const rows = await this.db.query<{ id: number }>(
      `SELECT id FROM ref.campus
       WHERE LOWER(BTRIM(nom)) = LOWER(BTRIM($1))
       LIMIT 2`,
      [nom],
    );
    if (rows.length === 0) {
      throw new BadRequestException(`Campus introuvable : ${nom}`);
    }
    if (rows.length > 1) {
      throw new BadRequestException(`Nom de campus ambigu : ${nom}`);
    }
    return rows[0].id;
  }

  private async trouverDepartement(
    nom: string,
    campusId: number | null,
  ): Promise<{ id: number; campus_id: number }> {
    const rows = await this.db.query<{ id: number; campus_id: number }>(
      `SELECT d.id, d.campus_id
       FROM ref.department d
       WHERE LOWER(BTRIM(d.nom)) = LOWER(BTRIM($1))
         AND ($2::int IS NULL OR d.campus_id = $2)
       LIMIT 2`,
      [nom, campusId],
    );
    if (rows.length === 0) {
      throw new BadRequestException(
        `Département introuvable dans le campus indiqué : ${nom}`,
      );
    }
    if (rows.length > 1) {
      throw new BadRequestException(
        `Nom de département ambigu, précisez le campus : ${nom}`,
      );
    }
    return rows[0];
  }
}

function validerLigne(record: Record<'matricule' | 'email' | 'nom' | 'prenom' | 'role', string> & {
  campus: string;
  departement: string;
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
    campus: lireNomPerimetre(record.campus, 'campus'),
    departement: lireNomPerimetre(record.departement, 'departement'),
  };
}

function lireNomPerimetre(valeur: string, champ: string): string | null {
  if (!valeur.trim()) return null;
  if (valeur.trim().length > 150) {
    throw new BadRequestException(`${champ} ne peut pas dépasser 150 caractères`);
  }
  return valeur.trim();
}

function estRole(role: string): role is ImportRole {
  return ROLES.some((roleAutorise) => roleAutorise === role);
}