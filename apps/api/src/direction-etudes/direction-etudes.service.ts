import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SEUIL_ANONYMAT } from '../resultats/resultats.constants';
import { ResultsDatabaseService } from '../resultats/results-database.service';

export interface PeriodeStatistique {
  anneeUniversitaire: string;
  semestre: number;
}

interface LignePerimetre {
  campus_id: number;
  campus: string;
  campagne_id: number;
  statut: string;
  course_id: number | null;
  inscriptions: number;
  participations: number;
}

interface LigneReponses {
  campaign_id: number;
  course_id: number;
  repondants: number;
  total_notes: number | string;
  somme_notes: number | string;
}

export interface CampusStats {
  campusId: number;
  campus: string;
  campagnes: number;
  campagnesCloses: number;
  inscriptions: number;
  participations: number;
  bulletins: number;
  tauxParticipation: number | null;
  moyenneEvaluations: number | null;
  coursSynthesables: number;
}

const REGLES_CONTROLE = [
  { code: 'CAMPAGNE_OUVERTE_ECHUE', description: 'Une campagne doit être clôturée à sa date de fin.' },
  {
    code: 'CAMPAGNE_OUVERTE_SANS_COURS',
    description: 'Une campagne ouverte doit couvrir un cours du département, de l’année et du semestre concernés.',
  },
  {
    code: 'CAMPAGNE_OUVERTE_SANS_CRITERE',
    description: 'Une campagne ouverte doit utiliser un questionnaire contenant au moins un critère.',
  },
  {
    code: 'CAMPAGNE_CLOTUREE_SANS_DATE',
    description: 'Une campagne clôturée ou restituée doit porter une date de clôture.',
  },
  {
    code: 'CAMPAGNE_RESTITUEE_SANS_PUBLICATION',
    description: 'Une campagne restituée doit avoir une restitution enregistrée.',
  },
];

@Injectable()
export class DirectionEtudesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly resultsDb: ResultsDatabaseService,
  ) {}

  async synthese(periode: PeriodeStatistique) {
    const lignes = await this.lignesPerimetre(periode);
    const nomsCampus = await this.db.query<{ id: number; nom: string }>(
      'SELECT id, nom FROM ref.campus ORDER BY nom',
    );
    const statsParCampus = new Map<number, CampusStats>();
    for (const campus of nomsCampus) {
      statsParCampus.set(campus.id, {
        campusId: campus.id,
        campus: campus.nom,
        campagnes: 0,
        campagnesCloses: 0,
        inscriptions: 0,
        participations: 0,
        bulletins: 0,
        tauxParticipation: null,
        moyenneEvaluations: null,
        coursSynthesables: 0,
      });
    }

    const campagnesParCampus = new Map<number, Set<number>>();
    const campagnesClosesParCampus = new Map<number, Set<number>>();
    const coursParCle = new Map<string, { campusId: number; inscriptions: number; participations: number }>();
    for (const ligne of lignes) {
      const stats = statsParCampus.get(ligne.campus_id);
      if (!stats) continue;
      if (!campagnesParCampus.has(ligne.campus_id)) campagnesParCampus.set(ligne.campus_id, new Set());
      campagnesParCampus.get(ligne.campus_id)?.add(ligne.campagne_id);
      if (ligne.statut === 'close' || ligne.statut === 'restituee') {
        if (!campagnesClosesParCampus.has(ligne.campus_id)) {
          campagnesClosesParCampus.set(ligne.campus_id, new Set());
        }
        campagnesClosesParCampus.get(ligne.campus_id)?.add(ligne.campagne_id);
      }
      if (ligne.course_id !== null) {
        const cle = ligne.campagne_id + ':' + ligne.course_id;
        const cours = coursParCle.get(cle) ?? {
          campusId: ligne.campus_id,
          inscriptions: 0,
          participations: 0,
        };
        cours.inscriptions = ligne.inscriptions;
        cours.participations = ligne.participations;
        coursParCle.set(cle, cours);
      }
    }

    const idsCampagnesCloses = lignes
      .filter((ligne) => ligne.statut === 'close' || ligne.statut === 'restituee')
      .map((ligne) => ligne.campagne_id);
    const reponses = idsCampagnesCloses.length === 0
      ? []
      : await this.resultsDb.lire<LigneReponses>(
          `SELECT b.campaign_id, b.course_id,
                  COUNT(DISTINCT b.id)::int AS repondants,
                  COUNT(a.valeur)::int AS total_notes,
                  COALESCE(SUM(a.valeur), 0)::float AS somme_notes
           FROM ballot.ballots b
           JOIN evaluation.campaigns c ON c.id = b.campaign_id
             AND c.statut IN ('close', 'restituee')
             AND c.urne_melangee_le IS NOT NULL
           JOIN ballot.ballot_answers a ON a.ballot_id = b.id
           WHERE b.campaign_id = ANY($1::int[])
           GROUP BY b.campaign_id, b.course_id`,
          [[...new Set(idsCampagnesCloses)]],
        );

    let sommeNotesGlobale = 0;
    let nombreNotesGlobal = 0;
    const sommesParCampus = new Map<number, { somme: number; nombre: number }>();
    const reponsesParCours = new Map<string, LigneReponses>();
    for (const resultat of reponses) {
      reponsesParCours.set(resultat.campaign_id + ':' + resultat.course_id, resultat);
    }

    for (const stats of statsParCampus.values()) {
      stats.campagnes = campagnesParCampus.get(stats.campusId)?.size ?? 0;
      stats.campagnesCloses = campagnesClosesParCampus.get(stats.campusId)?.size ?? 0;
    }
    for (const [cle, cours] of coursParCle) {
      const stats = statsParCampus.get(cours.campusId);
      if (!stats) continue;
      stats.inscriptions += cours.inscriptions;
      stats.participations += cours.participations;
      const resultat = reponsesParCours.get(cle);
      if (!resultat) continue;
      stats.bulletins += resultat.repondants;
      if (resultat.repondants < SEUIL_ANONYMAT) continue;
      const nombre = Number(resultat.total_notes);
      const somme = Number(resultat.somme_notes);
      stats.coursSynthesables++;
      const campusSomme = sommesParCampus.get(cours.campusId) ?? { somme: 0, nombre: 0 };
      campusSomme.somme += somme;
      campusSomme.nombre += nombre;
      sommesParCampus.set(cours.campusId, campusSomme);
      sommeNotesGlobale += somme;
      nombreNotesGlobal += nombre;
    }

    for (const stats of statsParCampus.values()) {
      stats.tauxParticipation = stats.inscriptions === 0
        ? null
        : Math.round((stats.participations / stats.inscriptions) * 10000) / 100;
      const somme = sommesParCampus.get(stats.campusId);
      stats.moyenneEvaluations = somme && somme.nombre > 0
        ? Math.round((somme.somme / somme.nombre) * 100) / 100
        : null;
    }

    const campus = [...statsParCampus.values()];
    const totalInscriptions = campus.reduce((total, ligne) => total + ligne.inscriptions, 0);
    const totalParticipations = campus.reduce((total, ligne) => total + ligne.participations, 0);
    return {
      periode,
      seuilAnonymat: SEUIL_ANONYMAT,
      global: {
        campus: campus.length,
        campagnes: campus.reduce((total, ligne) => total + ligne.campagnes, 0),
        campagnesCloses: campus.reduce((total, ligne) => total + ligne.campagnesCloses, 0),
        inscriptions: totalInscriptions,
        participations: totalParticipations,
        bulletins: campus.reduce((total, ligne) => total + ligne.bulletins, 0),
        tauxParticipation: totalInscriptions === 0
          ? null
          : Math.round((totalParticipations / totalInscriptions) * 10000) / 100,
        moyenneEvaluations: nombreNotesGlobal === 0
          ? null
          : Math.round((sommeNotesGlobale / nombreNotesGlobal) * 100) / 100,
        coursSynthesables: campus.reduce((total, ligne) => total + ligne.coursSynthesables, 0),
      },
      campus,
    };
  }

  async publier(periode: PeriodeStatistique, userId: number) {
    const statistiques = await this.synthese(periode);
    const lignes = await this.db.query<{ id: number; publie_le: Date }>(
      `INSERT INTO evaluation.global_statistics_publications
         (annee_universitaire, semestre, statistiques, publie_par)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING id, publie_le`,
      [periode.anneeUniversitaire, periode.semestre, JSON.stringify(statistiques), userId],
    );
    return { ...lignes[0], statistiques };
  }

  async dernieresPublications() {
    return this.db.query(
      `SELECT DISTINCT ON (annee_universitaire, semestre)
              id, annee_universitaire AS "anneeUniversitaire",
              semestre, statistiques, publie_le AS "publieLe"
       FROM evaluation.global_statistics_publications
       ORDER BY annee_universitaire DESC, semestre DESC, publie_le DESC`,
    );
  }

  async controlesAcademiques(periode?: PeriodeStatistique) {
    const lignes = await this.db.query<{
      code: string;
      campus: string;
      departement: string;
      campagne_id: number;
      libelle: string;
      annee_universitaire: string;
      semestre: number;
    }>(
      `SELECT anomalies.code, c.nom AS campus, d.nom AS departement,
              campagne.id AS campagne_id, campagne.libelle,
              campagne.annee_universitaire, campagne.semestre
       FROM evaluation.campaigns campagne
       JOIN ref.department d ON d.id = campagne.department_id
       JOIN ref.campus c ON c.id = d.campus_id
       CROSS JOIN LATERAL (VALUES
         ('CAMPAGNE_OUVERTE_ECHUE',
           campagne.statut = 'ouverte' AND campagne.fin <= NOW()),
         ('CAMPAGNE_OUVERTE_SANS_COURS',
           campagne.statut = 'ouverte' AND NOT EXISTS (
             SELECT 1 FROM ref.program p JOIN ref.course co ON co.program_id = p.id
             WHERE p.department_id = campagne.department_id
               AND co.annee_universitaire = campagne.annee_universitaire
               AND co.semestre = campagne.semestre)),
         ('CAMPAGNE_OUVERTE_SANS_CRITERE',
           campagne.statut = 'ouverte' AND NOT EXISTS (
             SELECT 1 FROM evaluation.sections s
             JOIN evaluation.criteria cr ON cr.section_id = s.id
             WHERE s.version_id = campagne.version_id)),
         ('CAMPAGNE_CLOTUREE_SANS_DATE',
           campagne.statut IN ('close', 'restituee') AND campagne.close_le IS NULL),
         ('CAMPAGNE_RESTITUEE_SANS_PUBLICATION',
           campagne.statut = 'restituee' AND NOT EXISTS (
             SELECT 1 FROM evaluation.restitutions r WHERE r.campaign_id = campagne.id))
       ) AS anomalies(code, est_anormale)
       WHERE anomalies.est_anormale
         AND ($1::text IS NULL OR campagne.annee_universitaire = $1)
         AND ($2::smallint IS NULL OR campagne.semestre = $2)
       ORDER BY c.nom, d.nom, campagne.annee_universitaire DESC, campagne.semestre, campagne.id`,
      [periode?.anneeUniversitaire ?? null, periode?.semestre ?? null],
    );
    return {
      reglesVerifiees: REGLES_CONTROLE,
      nombreAnomalies: lignes.length,
      anomalies: lignes.map((ligne) => ({
        code: ligne.code,
        campus: ligne.campus,
        departement: ligne.departement,
        campagneId: ligne.campagne_id,
        libelle: ligne.libelle,
        anneeUniversitaire: ligne.annee_universitaire,
        semestre: ligne.semestre,
      })),
    };
  }

  private lignesPerimetre(periode: PeriodeStatistique): Promise<LignePerimetre[]> {
    return this.db.query<LignePerimetre>(
      `SELECT campus.id AS campus_id, campus.nom AS campus,
              campagne.id AS campagne_id, campagne.statut,
              co.id AS course_id,
              COUNT(DISTINCT e.student_id)::int AS inscriptions,
              COUNT(DISTINCT pl.student_id)::int AS participations
       FROM evaluation.campaigns campagne
       JOIN ref.department d ON d.id = campagne.department_id
       JOIN ref.campus campus ON campus.id = d.campus_id
       LEFT JOIN ref.program p ON p.department_id = d.id
       LEFT JOIN ref.course co ON co.program_id = p.id
         AND co.annee_universitaire = campagne.annee_universitaire
         AND co.semestre = campagne.semestre
       LEFT JOIN ref.enrollment e ON e.course_id = co.id
       LEFT JOIN evaluation.participation_ledger pl
         ON pl.campaign_id = campagne.id AND pl.course_id = co.id
       WHERE campagne.annee_universitaire = $1 AND campagne.semestre = $2
       GROUP BY campus.id, campus.nom, campagne.id, campagne.statut, co.id
       ORDER BY campus.nom, campagne.id, co.id`,
      [periode.anneeUniversitaire, periode.semestre],
    );
  }
}
