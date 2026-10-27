import { BadRequestException } from '@nestjs/common';
import {
  formerIdCommentaire,
  lireRefCommentaire,
  validerDecision,
  validerFiltreStatut,
} from './moderation.validation';

const UUID = '3d2ffb41-1f7c-464c-bccf-0d9ca21a3958';

describe('identifiant de commentaire', () => {
  it('forme puis relit un identifiant', () => {
    const id = formerIdCommentaire(UUID, 'points_forts');
    expect(id).toBe(UUID + '.points_forts');
    expect(lireRefCommentaire(id)).toEqual({ ballotId: UUID, type: 'points_forts' });
  });

  it('accepte les deux types', () => {
    expect(lireRefCommentaire(UUID + '.points_a_ameliorer')?.type).toBe('points_a_ameliorer');
  });

  it('refuse tout le reste', () => {
    for (const mauvais of [
      '',
      'abc',
      UUID,
      UUID + '.autre',
      UUID.toUpperCase() + '.points_forts',
      UUID + '.points_forts; DROP TABLE x',
      '1',
      '../' + UUID + '.points_forts',
    ]) {
      expect(lireRefCommentaire(mauvais)).toBeNull();
    }
  });
});

describe('validerFiltreStatut', () => {
  it('accepte les trois statuts et l absence de filtre', () => {
    expect(validerFiltreStatut('a_moderer')).toBe('a_moderer');
    expect(validerFiltreStatut('valide')).toBe('valide');
    expect(validerFiltreStatut('masque')).toBe('masque');
    expect(validerFiltreStatut(undefined)).toBeUndefined();
    expect(validerFiltreStatut('')).toBeUndefined();
  });

  it('refuse un statut inconnu', () => {
    expect(() => validerFiltreStatut('zzz')).toThrow(BadRequestException);
  });
});

describe('validerDecision', () => {
  it('accepte valide et masque', () => {
    expect(validerDecision({ statut: 'valide' })).toBe('valide');
    expect(validerDecision({ statut: 'masque' })).toBe('masque');
  });

  it('refuse a_moderer, un corps vide et un type incorrect', () => {
    for (const mauvais of [{ statut: 'a_moderer' }, {}, null, { statut: 1 }, { statut: 'autre' }]) {
      expect(() => validerDecision(mauvais)).toThrow(BadRequestException);
    }
  });

  it('ignore tout autre champ, en particulier un texte', () => {
    expect(validerDecision({ statut: 'valide', texte: 'reecrit' })).toBe('valide');
  });
});