import { BadRequestException } from '@nestjs/common';
import { validerBulletin } from './ballots.validation';

const reponses = [
  { critereId: 1, valeur: 4 },
  { critereId: 2, valeur: null },
];
const valide = { jeton: 'jeton', reponses };

describe('validerBulletin', () => {
  it('accepte un bulletin valide, avec « Sans avis » (null)', () => {
    expect(validerBulletin(valide)).toEqual({ jeton: 'jeton', reponses });
  });

  it('ignore tout champ qui pourrait identifier l etudiant', () => {
    const r = validerBulletin({ ...valide, studentId: 9, matricule: 'X', ip: '1.2.3.4' });
    expect(JSON.stringify(r)).not.toMatch(/studentId|matricule|ip/);
  });

  it('refuse un jeton absent, vide, trop long ou qui n est pas du texte', () => {
    for (const mauvais of [undefined, '', 'a'.repeat(2001), 42]) {
      expect(() => validerBulletin({ ...valide, jeton: mauvais })).toThrow(BadRequestException);
    }
  });

  it('refuse des reponses absentes, vides ou trop nombreuses', () => {
    const trop = Array.from({ length: 201 }, (_, i) => ({ critereId: i + 1, valeur: 3 }));
    for (const mauvais of [undefined, [], 'x', trop]) {
      expect(() => validerBulletin({ ...valide, reponses: mauvais })).toThrow(BadRequestException);
    }
  });

  it('refuse une valeur hors de 1 a 5, non entiere, textuelle ou absente', () => {
    for (const valeur of [0, 6, 2.5, '4', undefined]) {
      expect(() =>
        validerBulletin({ jeton: 'j', reponses: [{ critereId: 1, valeur }] }),
      ).toThrow(BadRequestException);
    }
  });

  it('refuse un critereId invalide', () => {
    for (const critereId of [0, -1, 1.5, '1', undefined]) {
      expect(() =>
        validerBulletin({ jeton: 'j', reponses: [{ critereId, valeur: 3 }] }),
      ).toThrow(BadRequestException);
    }
  });

  it('refuse un critere en double', () => {
    const doublon = [
      { critereId: 1, valeur: 3 },
      { critereId: 1, valeur: 4 },
    ];
    expect(() => validerBulletin({ jeton: 'j', reponses: doublon })).toThrow(BadRequestException);
  });

  it('nettoie les commentaires et supprime les caracteres de controle', () => {
    const r = validerBulletin({ ...valide, pointsForts: '  Cours clair\u0000 \r\n', pointsAAmeliorer: '   ' });
    expect(r.pointsForts).toBe('Cours clair');
    expect(r.pointsAAmeliorer).toBeUndefined();
  });

  it('refuse un commentaire trop long ou qui n est pas du texte', () => {
    expect(() => validerBulletin({ ...valide, pointsForts: 'a'.repeat(2001) })).toThrow(BadRequestException);
    expect(() => validerBulletin({ ...valide, pointsAAmeliorer: 12 })).toThrow(BadRequestException);
  });

  it('accepte un commentaire de 2000 caracteres exactement', () => {
    expect(validerBulletin({ ...valide, pointsForts: 'a'.repeat(2000) }).pointsForts).toHaveLength(2000);
  });
});