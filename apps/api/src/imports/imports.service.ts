import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { parse } from 'csv-parse/sync';
import { ImportUserRowDto } from './dto/import-users.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly db: DatabaseService) {}

  async importUsers(fileBuffer: Buffer, currentUserScope: { campusId?: number }) {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const report = {
      totalRows: records.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as { line: number; error: string; data?: any }[],
    };

    let line = 1;
    for (const record of records) {
      line++;
      try {
        const row = record as ImportUserRowDto;

        await this.db.query('BEGIN');

        let campusId: number | null = null;
        let departmentId: number | null = null;

        if (row.campusCode) {
          const cRes = await this.db.query<{ id: number }>('SELECT id FROM ref.campus WHERE code = $1', [row.campusCode]);
          if (cRes.length === 0) throw new Error(`Campus introuvable: ${row.campusCode}`);
          campusId = cRes[0].id;
        }

        if (row.departmentCode) {
          const dRes = await this.db.query<{ id: number }>('SELECT id FROM ref.department WHERE code = $1', [row.departmentCode]);
          if (dRes.length === 0) throw new Error(`Département introuvable: ${row.departmentCode}`);
          departmentId = dRes[0].id;
        }

        const userRes = await this.db.query<{ id: number }>(
          `INSERT INTO identity.users (matricule, email, nom, prenom, actif)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (matricule) DO UPDATE SET email = EXCLUDED.email, nom = EXCLUDED.nom, prenom = EXCLUDED.prenom
           RETURNING id`,
          [row.matricule, row.email, row.nom, row.prenom]
        );

        const userId = userRes[0].id;

        await this.db.query(
          `INSERT INTO identity.user_roles (user_id, role, campus_id, department_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [userId, row.role, campusId, departmentId]
        );

        if (row.role === 'CHEF_DEPT' && departmentId) {
          await this.db.query(
            `INSERT INTO academic.department_heads (user_id, department_id)
             VALUES ($1, $2)
             ON CONFLICT (department_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
            [userId, departmentId]
          );
        }

        await this.db.query('COMMIT');
        report.successCount++;
      } catch (err: any) {
        await this.db.query('ROLLBACK');
        report.errorCount++;
        report.errors.push({
          line,
          error: err.message,
          data: record,
        });
      }
    }

    return report;
  }
}