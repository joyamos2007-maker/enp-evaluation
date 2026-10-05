import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function contexte(requete: unknown) {
  return { switchToHttp: () => ({ getRequest: () => requete }) } as never;
}

describe('AuthGuard', () => {
  const tokens = { verifierAcces: jest.fn() };
  const garde = new AuthGuard(tokens as never);

  beforeEach(() => tokens.verifierAcces.mockReset());

  it('refuse une requete sans jeton', () => {
    expect(() => garde.canActivate(contexte({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('refuse un jeton invalide', () => {
    tokens.verifierAcces.mockReturnValue(null);
    const requete = { headers: { authorization: 'Bearer faux' } };
    expect(() => garde.canActivate(contexte(requete))).toThrow(UnauthorizedException);
  });

  it('accepte un jeton valide et memorise l utilisateur', () => {
    tokens.verifierAcces.mockReturnValue({ sub: '3', roles: ['enseignant'] });
    const requete: { headers: Record<string, string>; utilisateur?: unknown } = {
      headers: { authorization: 'Bearer ok' },
    };
    expect(garde.canActivate(contexte(requete))).toBe(true);
    expect(requete.utilisateur).toEqual({ id: 3, roles: ['enseignant'] });
  });
});