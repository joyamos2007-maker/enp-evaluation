import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function contexte(requete: unknown) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'classe',
    switchToHttp: () => ({ getRequest: () => requete }),
  } as never;
}

describe('AuthGuard', () => {
  const tokens = { verifierAcces: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const garde = new AuthGuard(tokens as never, reflector as never);

  beforeEach(() => {
    tokens.verifierAcces.mockReset();
    reflector.getAllAndOverride.mockReset();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

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

  it('laisse passer une route publique sans jeton', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(garde.canActivate(contexte({ headers: {} }))).toBe(true);
    expect(tokens.verifierAcces).not.toHaveBeenCalled();
  });
});