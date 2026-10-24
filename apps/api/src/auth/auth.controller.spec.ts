import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const auth = { connecter: jest.fn(), rafraichir: jest.fn(), deconnecter: jest.fn() };
  const config = { get: jest.fn() };
  const identity = {};
  const controller = new AuthController(auth as never, config as never, identity as never);
  const reponse = { cookie: jest.fn(), clearCookie: jest.fn() };

  const expireLe = new Date('2030-01-01T00:00:00Z');
  const resultat = {
    accessToken: 'acces',
    expiresIn: 900,
    utilisateur: { id: 1, nom: 'T', prenom: 'E', roles: ['etudiant'], activeRole: 'etudiant' },
    refresh: { jeton: 'refresh-secret', expireLe },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockReturnValue('development');
  });

  it('login pose le cookie de session sans renvoyer le jeton dans le corps', async () => {
    auth.connecter.mockResolvedValue(resultat);
    const corps = await controller.login(
      { identifiant: 'TEST-0001', motDePasse: 'x' },
      reponse as never,
    );
    expect(corps).not.toHaveProperty('refresh');
    expect(JSON.stringify(corps)).not.toContain('refresh-secret');
    expect(reponse.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-secret',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1/auth',
        secure: false,
        expires: expireLe,
      }),
    );
  });

  it('marque le cookie Secure en production', async () => {
    config.get.mockReturnValue('production');
    auth.connecter.mockResolvedValue(resultat);
    await controller.login({ identifiant: 'TEST-0001', motDePasse: 'x' }, reponse as never);
    expect(reponse.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-secret',
      expect.objectContaining({ secure: true }),
    );
  });

  it('refuse (401) le renouvellement quand le cookie est absent', async () => {
    await expect(
      controller.rafraichir({ headers: {} }, reponse as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.rafraichir).not.toHaveBeenCalled();
  });

  it('renouvelle la session et pose le nouveau cookie', async () => {
    auth.rafraichir.mockResolvedValue({ ...resultat, refresh: { jeton: 'refresh-2', expireLe } });
    const corps = await controller.rafraichir(
      { headers: { cookie: 'autre=x; refresh_token=refresh-1' } },
      reponse as never,
    );
    expect(auth.rafraichir).toHaveBeenCalledWith('refresh-1');
    expect(corps).toHaveProperty('accessToken', 'acces');
    expect(reponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-2', expect.anything());
  });

  it('revoque la session et efface le cookie a la deconnexion', async () => {
    const res = await controller.deconnecter(
      { headers: { cookie: 'refresh_token=refresh-1' } },
      reponse as never,
    );
    expect(auth.deconnecter).toHaveBeenCalledWith('refresh-1');
    expect(reponse.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(res).toEqual({ ok: true });
  });
});