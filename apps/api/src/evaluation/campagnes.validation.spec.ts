import { lireId, validerCampagne } from './campagnes.validation';

const MAINTENANT = new Date('2026-10-06T00:00:00Z');
const valide = {
  libelle: 'Evaluation S5',
  departmentId: 1,
  anneeUniversitaire: '2026-2027',
  semestre: 5,
  debut: '2026-10-01T00:00:00Z',
  fin: '2026-12-15T00:00:00Z',
};

describe('validerCampagne', () => {
  it('accepte une campagne valide et retire les espaces du libelle', () => {
    const r = validerCampagne({ ...valide, libelle: '  Evaluation S5  ' }, MAINTENANT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valeur.libelle).toBe('Evaluation S5');
      expect(r.valeur.debut).toBeInstanceOf(Date);
      expect(r.valeur.semestre).toBe(5);
    }
  });

  it('refuse un corps absent', () => {
    expect(validerCampagne(null, MAINTENANT).ok).toBe(false);
  });

  it('refuse un libelle vide', () => {
    expect(validerCampagne({ ...valide, libelle: '   ' }, MAINTENANT).ok).toBe(false);
  });

  it('refuse un departmentId qui n est pas un entier positif', () => {
    for (const mauvais of ['1', 0, 1.5, -2]) {
      expect(validerCampagne({ ...valide, departmentId: mauvais }, MAINTENANT).ok).toBe(false);
    }
  });

  it('refuse une annee universitaire incorrecte', () => {
    for (const mauvaise of ['2026-2028', '26-27', '2026/2027', 2026]) {
      expect(validerCampagne({ ...valide, anneeUniversitaire: mauvaise }, MAINTENANT).ok).toBe(false);
    }
  });

  it('refuse un semestre hors de 1 a 10', () => {
    for (const mauvais of [0, 11, '5', 2.5]) {
      expect(validerCampagne({ ...valide, semestre: mauvais }, MAINTENANT).ok).toBe(false);
    }
  });

  it('refuse des dates invalides ou absentes', () => {
    expect(validerCampagne({ ...valide, debut: 'pas-une-date' }, MAINTENANT).ok).toBe(false);
    expect(validerCampagne({ ...valide, fin: undefined }, MAINTENANT).ok).toBe(false);
  });

  it('refuse une fin anterieure au debut', () => {
    const r = validerCampagne(
      { ...valide, debut: '2026-12-15T00:00:00Z', fin: '2026-12-01T00:00:00Z' },
      MAINTENANT,
    );
    expect(r.ok).toBe(false);
  });

  it('refuse une fin deja passee', () => {
    const r = validerCampagne(
      { ...valide, debut: '2026-08-01T00:00:00Z', fin: '2026-09-01T00:00:00Z' },
      MAINTENANT,
    );
    expect(r.ok).toBe(false);
  });
});

describe('lireId', () => {
  it('lit un entier positif', () => {
    expect(lireId('12')).toBe(12);
  });

  it('refuse le reste', () => {
    for (const mauvais of ['0', 'abc', '12abc', '-3', '1234567890', '', undefined]) {
      expect(lireId(mauvais)).toBeNull();
    }
  });
});