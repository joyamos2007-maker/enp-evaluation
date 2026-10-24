import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface UeAEvaluerDto {
  ueId: number; // identifiant de ref.course (une UE offerte pour un programme, une annee et un semestre)
  code: string;
  intitule: string;
  etat: 'a_faire' | 'terminee';
  campagneId: number;
  finCampagne: Date;
}

export interface QuestionnaireDto {
  versionId: number;
  sections: {
    code: string;
    titre: string;
    criteres: { id: number; code: string; libelle: string }[];
  }[];
  commentaires: { type: string; libelle: string }[];
}

interface LigneAFaire {
  ue_id: number;
  code: string;
  intitule: string;
  etat: 'a_faire' | 'terminee';
  campagne_id: number;
  fin_campagne: Date;
}

interface LigneCritere {
  section_code: string;
  titre: string;
  critere_id: number;
  critere_code: string;
  libelle: string;
}

@Injectable()
export class EvaluationsService {
  constructor(private readonly db: DatabaseService) {}

  // "terminee" signifie que la participation est enregistree (jeton emis).
  // Le nom de l'enseignant n'est volontairement pas renvoye.
  async aFaire(userId: number): Promise<UeAEvaluerDto[]> {
    const rows = await this.db.query<LigneAFaire>(
      `SELECT co.id AS ue_id, ue.code, ue.intitule, c.id AS campagne_id, c.fin AS fin_campagne,
              CASE WHEN l.student_id IS NULL THEN 'a_faire' ELSE 'terminee' END AS etat
       FROM ref.course co
       JOIN ref.ue ue ON ue.id = co.ue_id
       JOIN ref.program p ON p.id = co.program_id
       JOIN evaluation.campaigns c
         ON c.department_id = p.department_id
        AND c.annee_universitaire = co.annee_universitaire
        AND c.semestre = co.semestre
       LEFT JOIN ref.enrollment e ON e.course_id = co.id AND e.student_id = $1
       JOIN ref.enrollment e ON e.course_id = co.id AND e.student_id = $1
       LEFT JOIN evaluation.participation_ledger l
         ON l.campaign_id = c.id AND l.course_id = co.id AND l.student_id = $1
       WHERE c.statut = 'ouverte' AND c.debut <= NOW() AND c.fin > NOW()
       ORDER BY ue.code`,
      [userId],
    );
    return rows.map((r) => ({
      ueId: r.ue_id,
      code: r.code,
      intitule: r.intitule,
      etat: r.etat,
      campagneId: r.campagne_id,
      finCampagne: r.fin_campagne,
    }));
  }

  async questionnaire(campagneId: number): Promise<QuestionnaireDto> {
    const campagnes = await this.db.query<{ version_id: number }>(
      `SELECT version_id FROM evaluation.campaigns
       WHERE id = $1 AND statut = 'ouverte' AND debut <= NOW() AND fin > NOW()`,
      [campagneId],
    );
    if (campagnes.length === 0) {
      throw new NotFoundException('Campagne introuvable ou fermee');
    }
    const versionId = campagnes[0].version_id;

    const lignes = await this.db.query<LigneCritere>(
      `SELECT s.code AS section_code, s.titre, cr.id AS critere_id,
              cr.code AS critere_code, cr.libelle
       FROM evaluation.sections s
       JOIN evaluation.criteria cr ON cr.section_id = s.id
       WHERE s.version_id = $1
       ORDER BY s.ordre, cr.ordre`,
      [versionId],
    );
    const sections: QuestionnaireDto['sections'] = [];
    for (const l of lignes) {
      let section = sections.find((s) => s.code === l.section_code);
      if (!section) {
        section = { code: l.section_code, titre: l.titre, criteres: [] };
        sections.push(section);
      }
      section.criteres.push({ id: l.critere_id, code: l.critere_code, libelle: l.libelle });
    }

    const commentaires = await this.db.query<{ type: string; libelle: string }>(
      'SELECT type, libelle FROM evaluation.comment_fields WHERE version_id = $1 ORDER BY ordre',
      [versionId],
    );
    return { versionId, sections, commentaires };
  }
}