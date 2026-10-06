import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CampagneEntree } from './campagnes.validation';

export interface CampagneDto {
  id: number;
  libelle: string;
  departmentId: number;
  departement: string;
  anneeUniversitaire: string;
  semestre: number;
  versionId: number;
  debut: Date;
  fin: Date;
  statut: string;
}

interface CampagneLigne {
  id: number;
  libelle: string;
  department_id: number;
  departement: string;
  annee_universitaire: string;
  semestre: number;
  version_id: number;
  debut: Date;
  fin: Date;
  statut: string;
}

const SELECT_CAMPAGNE = `SELECT c.id, c.libelle, c.department_id, d.nom AS departement,
       c.annee_universitaire, c.semestre, c.version_id, c.debut, c.fin, c.statut
FROM evaluation.campaigns c
JOIN ref.department d ON d.id = c.department_id`;

function versDto(l: CampagneLigne): CampagneDto {
  return {
    id: l.id,
    libelle: l.libelle,
    departmentId: l.department_id,
    departement: l.departement,
    anneeUniversitaire: l.annee_universitaire,
    semestre: l.semestre,
    versionId: l.version_id,
    debut: l.debut,
    fin: l.fin,
    statut: l.statut,
  };
}

function codePg(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}

@Injectable()
export class CampagnesService {
  constructor(private readonly db: DatabaseService) {}

  async creer(entree: CampagneEntree): Promise<CampagneDto> {
    const versions = await this.db.query<{ id: number }>(
      'SELECT id FROM evaluation.questionnaire_versions WHERE actif LIMIT 1',
    );
    if (versions.length === 0) {
      throw new ConflictException('Aucune version de questionnaire active');
    }

    let id: number;
    try {
      const rows = await this.db.query<{ id: number }>(
        `INSERT INTO evaluation.campaigns
           (libelle, department_id, annee_universitaire, semestre, version_id, debut, fin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          entree.libelle,
          entree.departmentId,
          entree.anneeUniversitaire,
          entree.semestre,
          versions[0].id,
          entree.debut,
          entree.fin,
        ],
      );
      id = rows[0].id;
    } catch (err) {
      const code = codePg(err);
      if (code === '23505') {
        throw new ConflictException(
          'Une campagne existe deja pour ce departement, cette annee et ce semestre',
        );
      }
      if (code === '23503') throw new BadRequestException('Departement introuvable');
      throw err;
    }
    return this.trouver(id);
  }

  async lister(): Promise<CampagneDto[]> {
    const rows = await this.db.query<CampagneLigne>(SELECT_CAMPAGNE + ' ORDER BY c.id DESC');
    return rows.map(versDto);
  }

  async trouver(id: number): Promise<CampagneDto> {
    const campagne = await this.trouverOuNull(id);
    if (!campagne) throw new NotFoundException('Campagne introuvable');
    return campagne;
  }

  // Une seule requete : le passage en "ouverte" n'a lieu que si toutes les
  // conditions sont remplies au meme instant
  async ouvrir(id: number): Promise<CampagneDto> {
    const rows = await this.db.query<{ id: number }>(
      `UPDATE evaluation.campaigns c
       SET statut = 'ouverte', ouverte_le = NOW()
       WHERE c.id = $1 AND c.statut = 'brouillon' AND c.fin > NOW()
         AND EXISTS (
           SELECT 1 FROM ref.course co
           JOIN ref.program p ON p.id = co.program_id
           WHERE p.department_id = c.department_id
             AND co.annee_universitaire = c.annee_universitaire
             AND co.semestre = c.semestre)
         AND EXISTS (
           SELECT 1 FROM evaluation.criteria cr
           JOIN evaluation.sections s ON s.id = cr.section_id
           WHERE s.version_id = c.version_id)
       RETURNING c.id`,
      [id],
    );
    if (rows.length === 0) await this.expliquerRefusOuverture(id);
    return this.trouver(id);
  }

  async cloturer(id: number): Promise<CampagneDto> {
    const rows = await this.db.query<{ id: number }>(
      `UPDATE evaluation.campaigns
       SET statut = 'close', close_le = NOW()
       WHERE id = $1 AND statut = 'ouverte'
       RETURNING id`,
      [id],
    );
    if (rows.length === 0) {
      const campagne = await this.trouverOuNull(id);
      if (!campagne) throw new NotFoundException('Campagne introuvable');
      throw new ConflictException('Seule une campagne ouverte peut etre cloturee');
    }
    return this.trouver(id);
  }

  private async trouverOuNull(id: number): Promise<CampagneDto | null> {
    const rows = await this.db.query<CampagneLigne>(SELECT_CAMPAGNE + ' WHERE c.id = $1', [id]);
    return rows[0] ? versDto(rows[0]) : null;
  }

  private async expliquerRefusOuverture(id: number): Promise<never> {
    const campagne = await this.trouverOuNull(id);
    if (!campagne) throw new NotFoundException('Campagne introuvable');
    if (campagne.statut !== 'brouillon') {
      throw new ConflictException('Seule une campagne en brouillon peut etre ouverte');
    }
    if (campagne.fin.getTime() <= Date.now()) {
      throw new ConflictException('La date de fin est deja passee');
    }
    throw new ConflictException(
      'Perimetre vide : aucune UE pour ce departement, cette annee et ce semestre, ou questionnaire vide',
    );
  }
}