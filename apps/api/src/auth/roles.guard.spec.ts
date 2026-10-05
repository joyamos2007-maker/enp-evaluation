import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function contexte(requete: unknown) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'classe',
    switchToHttp: () => ({ getRequest: () => requete }),
  } as never;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const garde = new RolesGuard(reflector as never);

  beforeEach(() => reflector.getAllAndOverride.mockReset());

  it('laisse passer quand aucun role n est exige', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(garde.canActivate(contexte({}))).toBe(true);
  });

  it('laisse passer un utilisateur qui a le role exige', () => {
    reflector.getAllAndOverride.mockReturnValue(['scolarite']);
    const requete = { utilisateur: { id: 2, roles: ['scolarite'] } };
    expect(garde.canActivate(contexte(requete))).toBe(true);
  });

  it('laisse passer quand un seul des roles exiges suffit', () => {
    reflector.getAllAndOverride.mockReturnValue(['scolarite', 'admin']);
    const requete = { utilisateur: { id: 3, roles: ['admin'] } };
    expect(garde.canActivate(contexte(requete))).toBe(true);
  });

  it('refuse (403) un utilisateur sans le role exige', () => {
    reflector.getAllAndOverride.mockReturnValue(['scolarite']);
    const requete = { utilisateur: { id: 1, roles: ['etudiant'] } };
    expect(() => garde.canActivate(contexte(requete))).toThrow(ForbiddenException);
  });

  it('refuse quand l utilisateur n est pas authentifie', () => {
    reflector.getAllAndOverride.mockReturnValue(['etudiant']);
    expect(() => garde.canActivate(contexte({}))).toThrow(ForbiddenException);
  });

  it('refuse un utilisateur qui n a aucun role', () => {
    reflector.getAllAndOverride.mockReturnValue(['etudiant']);
    const requete = { utilisateur: { id: 9, roles: [] } };
    expect(() => garde.canActivate(contexte(requete))).toThrow(ForbiddenException);
  });
});