import { BadRequestException } from '@nestjs/common';

export interface ReponseEntree {
  critereId: number;
  valeur: number | null; // null = « Sans avis »
}

export interface BulletinEntree {
  jeton: string;
  reponses: ReponseEntree[];
  pointsForts?: string;
  pointsAAmeliorer?: string;
}

const LONGUEUR_MAX_COMMENTAIRE = 2000;

function nettoyer(texte: string): string {
  return (
    texte
      .replace(/\r\n/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
  );
}

function lireCommentaire(valeur: unknown, nom: string): string | undefined {
  if (valeur === undefined || valeur === null) return undefined;
  if (typeof valeur !== 'string') throw new BadRequestException(nom + ' doit etre du texte');
  if (valeur.length > 20000) throw new BadRequestException(nom + ' : texte trop long');
  const propre = nettoyer(valeur);
  if (propre.length > LONGUEUR_MAX_COMMENTAIRE) {
    throw new BadRequestException(nom + ' : 2000 caracteres maximum');
  }
  return propre.length > 0 ? propre : undefined;
}

// Tout champ inconnu est ignore : rien d'autre que ce qui est decrit ici n'est
// jamais transmis a la base.
export function validerBulletin(corps: unknown): BulletinEntree {
  const c = (corps ?? {}) as Record<string, unknown>;
  const { jeton, reponses } = c;

  if (typeof jeton !== 'string' || jeton.length < 1 || jeton.length > 2000) {
    throw new BadRequestException('jeton : texte de 1 a 2000 caracteres obligatoire');
  }
  if (!Array.isArray(reponses) || reponses.length < 1 || reponses.length > 200) {
    throw new BadRequestException('reponses : liste de 1 a 200 elements obligatoire');
  }

  const vus = new Set<number>();
  const liste: ReponseEntree[] = [];
  for (const r of reponses) {
    const { critereId, valeur } = (r ?? {}) as Record<string, unknown>;
    if (
      typeof critereId !== 'number' ||
      !Number.isInteger(critereId) ||
      critereId < 1 ||
      critereId > 2147483647
    ) {
      throw new BadRequestException('critereId : entier positif obligatoire');
    }
    if (valeur !== null && (typeof valeur !== 'number' || !Number.isInteger(valeur) || valeur < 1 || valeur > 5)) {
      throw new BadRequestException('valeur : entier de 1 a 5, ou null pour « Sans avis »');
    }
    if (vus.has(critereId)) throw new BadRequestException('critere en double : ' + critereId);
    vus.add(critereId);
    liste.push({ critereId, valeur });
  }

  return {
    jeton,
    reponses: liste,
    pointsForts: lireCommentaire(c.pointsForts, 'pointsForts'),
    pointsAAmeliorer: lireCommentaire(c.pointsAAmeliorer, 'pointsAAmeliorer'),
  };
}