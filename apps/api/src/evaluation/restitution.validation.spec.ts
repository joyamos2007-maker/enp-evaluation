import { BadRequestException } from '@nestjs/common';
import { validerRestitution } from './restitution.validation';

describe('validerRestitution', () => {
  it('accepte deux textes et retire les espaces et les caracteres de controle', () => {
    expect(validerRestitution({ resultats: '  Bons resultats\u0000 ', suites: 'Achat de materiel\r\n' })).toEqual({
      resultats: 'Bons resultats',
      suites: 'Achat de materiel',
    });
  });

  it('refuse un corps absent, des champs manquants ou qui ne sont pas du texte', () => {
    for (const mauvais of [null, {}, { resultats: 'R' }, { suites: 'S' }, { resultats: 1, suites: 2 }]) {
      expect(() => validerRestitution(mauvais)).toThrow(BadRequestException);
    }
  });

  it('refuse un texte vide ou compose d espaces', () => {
    expect(() => validerRestitution({ resultats: '   ', suites: 'S' })).toThrow(BadRequestException);
    expect(() => validerRestitution({ resultats: 'R', suites: '' })).toThrow(BadRequestException);
  });

  it('accepte 3000 caracteres exactement et refuse 3001', () => {
    expect(validerRestitution({ resultats: 'a'.repeat(3000), suites: 'S' }).resultats).toHaveLength(3000);
    expect(() => validerRestitution({ resultats: 'a'.repeat(3001), suites: 'S' })).toThrow(BadRequestException);
    expect(() => validerRestitution({ resultats: 'R', suites: 'a'.repeat(30001) })).toThrow(BadRequestException);
  });

  it('ignore tout autre champ', () => {
    const r = validerRestitution({ resultats: 'R', suites: 'S', publiePar: 99 });
    expect(Object.keys(r).sort()).toEqual(['resultats', 'suites']);
  });
});