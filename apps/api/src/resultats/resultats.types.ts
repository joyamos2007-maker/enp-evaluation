export type Distribution = [number, number, number, number, number];

export interface ResultatCritere {
  critereId: number;
  code: string;
  libelle: string;
  moyenne: number | null;
  distribution: Distribution; // effectifs des notes 1 a 5
  sansAvis: number;
}

export interface ResultatSection {
  code: string;
  titre: string;
  moyenne: number | null;
  criteres: ResultatCritere[];
}

export interface ResultatUeResume {
  ueId: number; // identifiant d'un ref.course
  code: string;
  intitule: string;
  campagneId: number;
  libelleCampagne: string;
  inscrits: number;
  repondants: number;
  detailDisponible: boolean;
}

export interface ResultatUe {
  ueId: number;
  code: string;
  intitule: string;
  campagneId: number;
  inscrits: number;
  repondants: number;
  seuil: number;
  detailDisponible: boolean;
  sections: ResultatSection[];
  pointsForts: string[];
  pointsAAmeliorer: string[];
}