import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const auth = {
    connecter: jest.fn(),
    verifierMfa: jest.fn(),
    rafraichir: jest.fn(),
    deconnecter: jest.fn(),
  };
  const config = { get: jest.fn() };
  const identity = {
    changerMotDePasse: jest.fn(),
    demanderChangementEmail: jest.fn(),
    confirmerChangementEmail: jest.fn(),
  };
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
    identity.changerMotDePasse.mockResolvedValue(undefined);
    identity.demanderChangementEmail.mockResolvedValue(undefined);
    identity.confirmerChangementEmail.mockResolvedValue(undefined);
  });

  it('login pose le cookie de session sans renvoyer le jeton dans le corps', async () => {
    auth.connecter.mockResolvedValue(resultat);
    const corps = await controller.login(
      { headers: {} },
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
    await controller.login(
      { headers: {} },
      { identifiant: 'TEST-0001', motDePasse: 'x' },
      reponse as never,
    );
    expect(reponse.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-secret',
      expect.objectContaining({ secure: true }),
    );
  });

  it('passe le jeton de confiance reçu en cookie au service de connexion', async () => {
    auth.connecter.mockResolvedValue(resultat);
    await controller.login(
      { headers: { cookie: 'mfa_trusted_device=device-token' } },
      { identifiant: 'TEST-0001', motDePasse: 'x' },
      reponse as never,
    );
    expect(auth.connecter).toHaveBeenCalledWith('TEST-0001', 'x', 'device-token');
  });

  it('pose un cookie HttpOnly lorsque l’appareil est mémorisé après le MFA', async () => {
    auth.verifierMfa.mockResolvedValue({
      ...resultat,
      appareilMfa: { jeton: 'device-token', expireLe },
    });
    const corps = await controller.verifierMfa(
      {
        challengeId: 'challenge-1',
        method: 'email',
        code: '123456',
        rememberDevice: true,
      },
      reponse as never,
    );

    expect(auth.verifierMfa).toHaveBeenCalledWith('challenge-1', 'email', '123456', true);
    expect(reponse.cookie).toHaveBeenCalledWith(
      'mfa_trusted_device',
      'device-token',
      expect.objectContaining({ httpOnly: true, expires: expireLe }),
    );
    expect(JSON.stringify(corps)).not.toContain('device-token');
  });

  it('révoque les sessions et efface les cookies après le changement du mot de passe', async () => {
    const corps = await controller.changerMotDePasse(
      { headers: {}, utilisateur: { id: 21, roles: ['admin'], activeRole: 'admin' } },
      {
        motDePasseActuel: 'ancien-mot-de-passe',
        nouveauMotDePasse: 'nouveau-mot-de-passe',
      },
      reponse as never,
    );

    expect(identity.changerMotDePasse).toHaveBeenCalledWith(
      21,
      'ancien-mot-de-passe',
      'nouveau-mot-de-passe',
    );
    expect(reponse.clearCookie).toHaveBeenCalledWith(
      'mfa_trusted_device',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(corps).toEqual({ ok: true });
  });

  it('demande un code de vérification pour la nouvelle adresse e-mail', async () => {
    const corps = await controller.demanderChangementEmail(
      { headers: {}, utilisateur: { id: 21, roles: ['admin'], activeRole: 'admin' } },
      {
        nouvelleAdresse: 'nouveau@enp.dz',
        motDePasseActuel: 'ancien-mot-de-passe',
      },
    );

    expect(identity.demanderChangementEmail).toHaveBeenCalledWith(
      21,
      'nouveau@enp.dz',
      'ancien-mot-de-passe',
    );
    expect(corps).toEqual({ ok: true });
  });

  it('confirme le code et efface les cookies de session après le changement e-mail', async () => {
    const corps = await controller.confirmerChangementEmail(
      { headers: {}, utilisateur: { id: 21, roles: ['admin'], activeRole: 'admin' } },
      { code: '123456' },
      reponse as never,
    );

    expect(identity.confirmerChangementEmail).toHaveBeenCalledWith(21, '123456');
    expect(reponse.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(reponse.clearCookie).toHaveBeenCalledWith(
      'mfa_trusted_device',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(corps).toEqual({ ok: true });
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