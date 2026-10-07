import type { Distribution, ResultatCritere, ResultatSection } from './resultats.types';

export interface LigneCritere {
  section_code: string;
  section_titre: string;
  critere_id: number;
  critere_code: string;
  libelle: string;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  sans_avis: number;
}

// « Sans avis » n'entre jamais dans ce calcul (regle RG-04)
export function moyenneDe(d: Distribution): number | null {
  const total = d[0] + d[1] + d[2] + d[3] + d[4];
  if (total === 0) return null;
  const somme = d[0] + 2 * d[1] + 3 * d[2] + 4 * d[3] + 5 * d[4];
  return Math.round((somme / total) * 100) / 100;
}

// La moyenne d'une section est calculee sur toutes les notes de la section
// (regle RG-05), pas comme moyenne des moyennes de criteres.
export function construireSections(lignes: LigneCritere[]): ResultatSection[] {
  const sections: {
    code: string;
    titre: string;
    criteres: ResultatCritere[];
    cumul: Distribution;
  }[] = [];

  for (const l of lignes) {
    let section = sections.find((s) => s.code === l.section_code);
    if (!section) {
      section = { code: l.section_code, titre: l.section_titre, criteres: [], cumul: [0, 0, 0, 0, 0] };
      sections.push(section);
    }
    const distribution: Distribution = [l.n1, l.n2, l.n3, l.n4, l.n5];
    section.criteres.push({
      critereId: l.critere_id,
      code: l.critere_code,
      libelle: l.libelle,
      moyenne: moyenneDe(distribution),
      distribution,
      sansAvis: l.sans_avis,
    });
    for (let i = 0; i < 5; i++) section.cumul[i] += distribution[i];
  }

  return sections.map((s) => ({
    code: s.code,
    titre: s.titre,
    moyenne: moyenneDe(s.cumul),
    criteres: s.criteres,
  }));
}