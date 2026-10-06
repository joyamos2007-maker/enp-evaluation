export interface CampagneEntree {
  libelle: string;
  departmentId: number;
  anneeUniversitaire: string;
  semestre: number;
  debut: Date;
  fin: Date;
}

export type ResultatValidation =
  | { ok: true; valeur: CampagneEntree }
  | { ok: false; erreur: string };

function entierPositif(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 2147483647;
}

function lireDate(v: unknown): Date | null {
  if (typeof v !== 'string' || v.length === 0 || v.length > 40) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t);
}

export function validerCampagne(
  corps: unknown,
  maintenant: Date = new Date(),
): ResultatValidation {
  const c = (corps ?? {}) as Record<string, unknown>;
  const { libelle, departmentId, anneeUniversitaire, semestre } = c;

  if (typeof libelle !== 'string' || libelle.trim().length < 1 || libelle.trim().length > 200) {
    return { ok: false, erreur: 'libelle : 1 a 200 caracteres' };
  }
  if (!entierPositif(departmentId)) {
    return { ok: false, erreur: 'departmentId : entier positif obligatoire' };
  }
  if (
    typeof anneeUniversitaire !== 'string' ||
    !/^[0-9]{4}-[0-9]{4}$/.test(anneeUniversitaire) ||
    Number(anneeUniversitaire.slice(5)) !== Number(anneeUniversitaire.slice(0, 4)) + 1
  ) {
    return {
      ok: false,
      erreur: 'anneeUniversitaire : format AAAA-AAAA avec deux annees consecutives (ex. 2025-2026)',
    };
  }
  if (
    typeof semestre !== 'number' ||
    !Number.isInteger(semestre) ||
    semestre < 1 ||
    semestre > 10
  ) {
    return { ok: false, erreur: 'semestre : entier de 1 a 10' };
  }

  const debut = lireDate(c.debut);
  const fin = lireDate(c.fin);
  if (!debut || !fin) {
    return { ok: false, erreur: 'debut et fin : dates ISO valides obligatoires' };
  }
  if (fin.getTime() <= debut.getTime()) {
    return { ok: false, erreur: 'fin doit etre posterieure a debut' };
  }
  if (fin.getTime() <= maintenant.getTime()) {
    return { ok: false, erreur: 'fin doit etre dans le futur' };
  }

  return {
    ok: true,
    valeur: { libelle: libelle.trim(), departmentId, anneeUniversitaire, semestre, debut, fin },
  };
}

// Lit un identifiant dans une URL ou un parametre : entier de 1 a 999 999 999
export function lireId(valeur: string | undefined): number | null {
  if (valeur === undefined || !/^[0-9]{1,9}$/.test(valeur)) return null;
  const n = Number(valeur);
  return n >= 1 ? n : null;
}