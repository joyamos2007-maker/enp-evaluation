import { construireSections, moyenneDe, type LigneCritere } from './calcul';

const ligne = (surcharge: Partial<LigneCritere>): LigneCritere => ({
  section_code: 'A',
  section_titre: 'Organisation',
  critere_id: 1,
  critere_code: 'A1',
  libelle: 'Objectifs',
  n1: 0,
  n2: 0,
  n3: 0,
  n4: 0,
  n5: 0,
  sans_avis: 0,
  ...surcharge,
});

describe('moyenneDe', () => {
  it('calcule la moyenne ponderee', () => {
    expect(moyenneDe([1, 1, 1, 1, 1])).toBe(3);
    expect(moyenneDe([0, 0, 0, 6, 0])).toBe(4);
  });

  it('arrondit a deux decimales', () => {
    expect(moyenneDe([0, 0, 1, 1, 1])).toBe(4);
    expect(moyenneDe([1, 0, 0, 0, 2])).toBe(3.67);
  });

  it('retourne null quand il n y a aucune note', () => {
    expect(moyenneDe([0, 0, 0, 0, 0])).toBeNull();
  });
});

describe('construireSections', () => {
  it('regroupe les criteres par section en gardant l ordre', () => {
    const res = construireSections([
      ligne({ critere_id: 1, critere_code: 'A1', n3: 2 }),
      ligne({ critere_id: 2, critere_code: 'A2', n4: 2 }),
      ligne({ section_code: 'B', section_titre: 'Qualite', critere_id: 3, critere_code: 'B1', n5: 2 }),
    ]);
    expect(res.map((s) => s.code)).toEqual(['A', 'B']);
    expect(res[0].criteres.map((c) => c.code)).toEqual(['A1', 'A2']);
  });

  it('calcule la moyenne de section sur toutes les notes, pas sur les moyennes de criteres', () => {
    // A1 : une note de 1 ; A2 : trois notes de 5. Moyenne des moyennes = 3 ; reelle = 4
    const res = construireSections([
      ligne({ critere_id: 1, critere_code: 'A1', n1: 1 }),
      ligne({ critere_id: 2, critere_code: 'A2', n5: 3 }),
    ]);
    expect(res[0].moyenne).toBe(4);
  });

  it('exclut « Sans avis » des moyennes et le compte a part', () => {
    const res = construireSections([ligne({ n1: 1, n2: 1, n3: 1, n4: 1, n5: 1, sans_avis: 1 })]);
    expect(res[0].criteres[0].moyenne).toBe(3);
    expect(res[0].criteres[0].sansAvis).toBe(1);
    expect(res[0].criteres[0].distribution).toEqual([1, 1, 1, 1, 1]);
  });

  it('retrouve les valeurs du test de bout en bout (section A = 3,83)', () => {
    const res = construireSections([
      ligne({ critere_id: 1, critere_code: 'A1', n1: 1, n2: 1, n3: 1, n4: 1, n5: 1, sans_avis: 1 }),
      ligne({ critere_id: 2, critere_code: 'A2', n4: 6 }),
      ligne({ critere_id: 3, critere_code: 'A3', n4: 6 }),
      ligne({ critere_id: 4, critere_code: 'A4', n4: 6 }),
      ligne({ critere_id: 5, critere_code: 'A5', n4: 6 }),
    ]);
    expect(res[0].moyenne).toBe(3.83);
  });

  it('retourne une liste vide sans ligne', () => {
    expect(construireSections([])).toEqual([]);
  });
});