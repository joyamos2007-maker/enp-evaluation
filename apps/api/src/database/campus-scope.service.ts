import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class CampusScopeService {
  constructor(private readonly db: DatabaseService) {}

  async forScolarite(userId: number, roles: string[]): Promise<number | null> {
    if (roles.includes('admin')) return null;
    if (!roles.includes('scolarite')) {
      throw new ForbiddenException('Accès réservé au service Scolarité ou à l’administration');
    }

    const rows = await this.db.query<{ campus_id: number | null }>(
      `SELECT campus_id
       FROM identity.user_roles
       WHERE user_id = $1 AND role = 'scolarite'`,
      [userId],
    );
    const campusId = rows[0]?.campus_id;
    if (typeof campusId !== 'number' || !Number.isSafeInteger(campusId) || campusId < 1) {
      throw new ForbiddenException('Ce compte Scolarité n’est rattaché à aucun campus');
    }
    return campusId;
  }

  async verifierDepartement(
    departmentId: number,
    campusId: number | null,
  ): Promise<void> {
    if (campusId === null) return;
    const rows = await this.db.query<{ id: number }>(
      'SELECT id FROM ref.department WHERE id = $1 AND campus_id = $2',
      [departmentId, campusId],
    );
    if (rows.length === 0) {
      throw new ForbiddenException('Ce département ne relève pas de votre campus');
    }
  }

  async forChefDepartement(userId: number, roles: string[]): Promise<number> {
    if (!roles.includes('chef_departement')) {
      throw new ForbiddenException('Accès réservé au Chef de département');
    }
    const rows = await this.db.query<{ department_id: number | null }>(
      `SELECT department_id
       FROM identity.user_roles
       WHERE user_id = $1 AND role = 'chef_departement'`,
      [userId],
    );
    const departmentId = rows[0]?.department_id;
    if (
      typeof departmentId !== 'number' ||
      !Number.isSafeInteger(departmentId) ||
      departmentId < 1
    ) {
      throw new ForbiddenException('Ce compte Chef de département n’est rattaché à aucun département');
    }
    return departmentId;
  }
}
