import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Campus {
  id: number;
  nom: string;
}

export interface Departement {
  id: number;
  nom: string;
  campusId: number;
  campus: string;
}

export interface Programme {
  id: number;
  nom: string;
  departmentId: number;
  departement: string;
}

export interface ScolariteCampus {
  userId: number;
  matricule: string | null;
  email: string | null;
  nom: string;
  prenom: string;
  campusId: number;
  campus: string;
}

function codePg(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}

@Injectable()
export class AdministrationService {
  constructor(private readonly db: DatabaseService) {}

  async referentiels(campusOnly = false) {
    const campus = await this.db.query<Campus>('SELECT id, nom FROM ref.campus ORDER BY nom');
    if (campusOnly) return { campus, departements: [], programmes: [] };
    const [departements, programmes] = await Promise.all([
      this.db.query<Departement>(
        `SELECT d.id, d.nom, d.campus_id AS "campusId", c.nom AS campus
         FROM ref.department d JOIN ref.campus c ON c.id = d.campus_id
         ORDER BY c.nom, d.nom`,
      ),
      this.db.query<Programme>(
        `SELECT p.id, p.nom, p.department_id AS "departmentId", d.nom AS departement
         FROM ref.program p JOIN ref.department d ON d.id = p.department_id
         ORDER BY d.nom, p.nom`,
      ),
    ]);
    return { campus, departements, programmes };
  }

  async creerCampus(nom: string): Promise<Campus> {
    try {
      const rows = await this.db.query<Campus>(
        'INSERT INTO ref.campus (nom) VALUES ($1) RETURNING id, nom',
        [nom],
      );
      return rows[0];
    } catch (err) {
      if (codePg(err) === '23505') throw new ConflictException('Ce campus existe déjà');
      throw err;
    }
  }

  async creerDepartement(campusId: number, nom: string): Promise<Departement> {
    try {
      const rows = await this.db.query<Departement>(
        `INSERT INTO ref.department (campus_id, nom)
         VALUES ($1, $2)
         RETURNING id, nom, campus_id AS "campusId",
           (SELECT c.nom FROM ref.campus c WHERE c.id = campus_id) AS campus`,
        [campusId, nom],
      );
      return rows[0];
    } catch (err) {
      if (codePg(err) === '23505') throw new ConflictException('Ce département existe déjà sur ce campus');
      if (codePg(err) === '23503') throw new NotFoundException('Campus introuvable');
      throw err;
    }
  }

  async creerProgramme(departmentId: number, nom: string): Promise<Programme> {
    try {
      const rows = await this.db.query<Programme>(
        `INSERT INTO ref.program (department_id, nom)
         VALUES ($1, $2)
         RETURNING id, nom, department_id AS "departmentId",
           (SELECT d.nom FROM ref.department d WHERE d.id = department_id) AS departement`,
        [departmentId, nom],
      );
      return rows[0];
    } catch (err) {
      if (codePg(err) === '23505') throw new ConflictException('Ce programme existe déjà dans ce département');
      if (codePg(err) === '23503') throw new NotFoundException('Département introuvable');
      throw err;
    }
  }

  async listerScolarites(): Promise<ScolariteCampus[]> {
    return this.db.query<ScolariteCampus>(
      `SELECT u.id AS "userId", u.matricule, u.email, u.nom, u.prenom,
              c.id AS "campusId", c.nom AS campus
       FROM identity.user_roles r
       JOIN identity.users u ON u.id = r.user_id
       JOIN ref.campus c ON c.id = r.campus_id
       WHERE r.role = 'scolarite'
       ORDER BY c.nom, u.nom, u.prenom`,
    );
  }

  async affecterScolarite(userId: number, campusId: number): Promise<ScolariteCampus> {
    try {
      const rows = await this.db.query<ScolariteCampus>(
        `INSERT INTO identity.user_roles (user_id, role, campus_id)
         VALUES ($1, 'scolarite', $2)
         ON CONFLICT (user_id, role) DO UPDATE
           SET campus_id = EXCLUDED.campus_id
           WHERE identity.user_roles.campus_id IS NULL
              OR identity.user_roles.campus_id = EXCLUDED.campus_id
         RETURNING user_id AS "userId", campus_id AS "campusId",
           (SELECT u.matricule FROM identity.users u WHERE u.id = user_id) AS matricule,
           (SELECT u.email FROM identity.users u WHERE u.id = user_id) AS email,
           (SELECT u.nom FROM identity.users u WHERE u.id = user_id) AS nom,
           (SELECT u.prenom FROM identity.users u WHERE u.id = user_id) AS prenom,
           (SELECT c.nom FROM ref.campus c WHERE c.id = campus_id) AS campus`,
        [userId, campusId],
      );
      if (rows[0]) return rows[0];
      throw new ConflictException('Ce compte Scolarité est déjà affecté à un autre campus');
    } catch (err) {
      if (codePg(err) === '23503') throw new NotFoundException('Utilisateur ou campus introuvable');
      throw err;
    }
  }
}
