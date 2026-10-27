import { BadRequestException } from '@nestjs/common';

export interface RestitutionEntree {
  resultats: string;
  suites: string;
}

function nettoyer(texte: string): string {
  return (
    texte
      .replace(/\r\n/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
  );
}

function lireTexte(valeur: unknown, nom: string): string {
  if (typeof valeur !== 'string') throw new BadRequestException(nom + ' : texte obligatoire');
  if (valeur.length > 30000) throw new BadRequestException(nom + ' : texte trop long');
  const propre = nettoyer(valeur);
  if (propre.length < 1 || propre.length > 3000) {
    throw new BadRequestException(nom + ' : 1 a 3000 caracteres');
  }
  return propre;
}

// Tout champ inconnu est ignore
export function validerRestitution(corps: unknown): RestitutionEntree {
  const c = (corps ?? {}) as Record<string, unknown>;
  return { resultats: lireTexte(c.resultats, 'resultats'), suites: lireTexte(c.suites, 'suites') };
}