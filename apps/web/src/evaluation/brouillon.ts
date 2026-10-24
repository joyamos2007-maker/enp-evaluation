import type { JetonVote, Note } from '@/api/types';

/**
 * Brouillon d'évaluation — SEULE exception autorisée au stockage navigateur.
 *
 * Contenu : réponses saisies + jeton de vote. JAMAIS d'identité, de jeton
 * d'accès, ni de donnée personnelle. Effacé après envoi réussi et à la
 * déconnexion.
 */

export interface BrouillonEvaluation {
  jeton: JetonVote;
  reponses: Record<number, Note>;
  pointsForts: string;
  pointsAAmeliorer: string;
  etape: number;
}

function cle(ueId: number, campagneId: number): string {
  return `brouillon-evaluation-${ueId}-${campagneId}`;
}

export function chargerBrouillon(
  ueId: number,
  campagneId: number,
): BrouillonEvaluation | null {
  try {
    const brut = sessionStorage.getItem(cle(ueId, campagneId));
    if (!brut) return null;
    return JSON.parse(brut) as BrouillonEvaluation;
  } catch {
    return null;
  }
}

export function sauvegarderBrouillon(
  ueId: number,
  campagneId: number,
  brouillon: BrouillonEvaluation,
): void {
  try {
    sessionStorage.setItem(cle(ueId, campagneId), JSON.stringify(brouillon));
  } catch {
    // Quota dépassé ou mode privé : on ignore silencieusement.
  }
}

export function effacerBrouillon(ueId: number, campagneId: number): void {
  try {
    sessionStorage.removeItem(cle(ueId, campagneId));
  } catch {
    // Ignore
  }
}

export function effacerTousLesBrouillons(): void {
  try {
    const cles: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('brouillon-evaluation-')) cles.push(k);
    }
    cles.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
