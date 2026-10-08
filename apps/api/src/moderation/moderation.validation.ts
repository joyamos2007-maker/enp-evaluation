import { BadRequestException } from '@nestjs/common';

export type TypeCommentaire = 'points_forts' | 'points_a_ameliorer';
export type StatutModeration = 'a_moderer' | 'valide' | 'masque';
export type DecisionModeration = 'valide' | 'masque';

export interface RefCommentaire {
  ballotId: string;
  type: TypeCommentaire;
}

const MOTIF_ID =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(points_forts|points_a_ameliorer)$/;

// L'identifiant public d'un commentaire est opaque : jamais de numero d'ordre
export function formerIdCommentaire(ballotId: string, type: string): string {
  return ballotId + '.' + type;
}

export function lireRefCommentaire(id: string): RefCommentaire | null {
  const m = MOTIF_ID.exec(id);
  return m ? { ballotId: m[1], type: m[2] as TypeCommentaire } : null;
}

export function validerFiltreStatut(valeur: string | undefined): StatutModeration | undefined {
  if (valeur === undefined || valeur === '') return undefined;
  if (valeur === 'a_moderer' || valeur === 'valide' || valeur === 'masque') return valeur;
  throw new BadRequestException('statut : a_moderer, valide ou masque');
}

export function validerDecision(corps: unknown): DecisionModeration {
  const { statut } = (corps ?? {}) as Record<string, unknown>;
  if (statut === 'valide' || statut === 'masque') return statut;
  throw new BadRequestException('statut : valide ou masque');
}