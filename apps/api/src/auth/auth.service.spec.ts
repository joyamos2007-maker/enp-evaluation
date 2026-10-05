import { HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = {
    trouverParIdentifiant: jest.fn(),
    trouverParId: jest.fn(),
    rolesDe: jest.fn(),
    enregistrerEchec: jest.fn(),
    reinitialiserEchecs: jest.fn(),
  };
  const passwords = { verify: jest.fn(), hash: jest.fn() };
  const tokens = { signerAcces: jest.fn() };
  const sessions = { creer: jest.fn(), renouveler: jest.fn(), revoquer: jest.fn() };
  const service = new AuthService(
    users as never,
    passwords as never,
    tokens as never,
    sessions as never,
  );

  const expireLe = new Date('2030-01-01T00:00:00Z');
  const utilisateur = {
    id: 1,
    matricule: 'TEST-0001',
    email: null,
    nom: 'TEST',
    prenom: 'Etudiant',
    mot_de_passe_hash: 'hash',
    actif: true,
    tentatives_echouees: 0,
    verrouille_jusqua: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    passwords.hash.mockResolvedValue('empreinte-factice');
    tokens.signerAcces.mockReturnValue('jeton-signe');
    users.rolesDe.mockResolvedValue(['etudiant']);
    sessions.creer.mockResolvedValue({ jeton: 'refresh-1', expireLe });
  });

  it('connecte un utilisateur valide et ouvre une session', async () => {
    users.trouverParIdentifiant.mockResolvedValue(utilisateur);
    passwords.verify.mockResolvedValue(true);
    const res = await service.connecter('TEST-0001', 'bon');
    expect(res.accessToken).toBe('jeton-signe');
    expect(res.utilisateur).toEqual({ id: 1, nom: 'TEST', prenom: 'Etudiant', roles: ['etudiant'] });
    expect(res.refresh).toEqual({ jeton: 'refresh-1', expireLe });
    expect(tokens.signerAcces).toHaveBeenCalledWith({ sub: '1', roles: ['etudiant'] });
    expect(users.reinitialiserEchecs).not.toHaveBeenCalled();
  });

  it('refuse un mauvais mot de passe et enregistre l echec', async () => {
    users.trouverParIdentifiant.mockResolvedValue(utilisateur);
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('TEST-0001', 'mauvais')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.enregistrerEchec).toHaveBeenCalledWith(1);
    expect(tokens.signerAcces).not.toHaveBeenCalled();
    expect(sessions.creer).not.toHaveBeenCalled();
  });

  it('refuse un identifiant inconnu en verifiant quand meme une empreinte factice', async () => {
    users.trouverParIdentifiant.mockResolvedValue(null);
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('inconnu', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.verify).toHaveBeenCalledWith('empreinte-factice', 'x');
    expect(users.enregistrerEchec).not.toHaveBeenCalled();
  });

  it('refuse un compte desactive sans compter d echec', async () => {
    users.trouverParIdentifiant.mockResolvedValue({ ...utilisateur, actif: false });
    passwords.verify.mockResolvedValue(true);
    await expect(service.connecter('TEST-0001', 'bon')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.enregistrerEchec).not.toHaveBeenCalled();
  });

  it('refuse un compte pas encore active sans compter d echec', async () => {
    users.trouverParIdentifiant.mockResolvedValue({ ...utilisateur, mot_de_passe_hash: null });
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('TEST-0001', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.enregistrerEchec).not.toHaveBeenCalled();
  });

  it('refuse (429) un compte verrouille sans verifier le mot de passe', async () => {
    users.trouverParIdentifiant.mockResolvedValue({
      ...utilisateur,
      verrouille_jusqua: new Date(Date.now() + 10 * 60 * 1000),
    });
    const erreur = await service.connecter('TEST-0001', 'bon').catch((e) => e);
    expect(erreur).toBeInstanceOf(HttpException);
    expect((erreur as HttpException).getStatus()).toBe(429);
    expect(passwords.verify).not.toHaveBeenCalled();
    expect(tokens.signerAcces).not.toHaveBeenCalled();
  });

  it('accepte la connexion une fois le verrouillage termine', async () => {
    users.trouverParIdentifiant.mockResolvedValue({
      ...utilisateur,
      verrouille_jusqua: new Date(Date.now() - 60 * 1000),
    });
    passwords.verify.mockResolvedValue(true);
    const res = await service.connecter('TEST-0001', 'bon');
    expect(res.accessToken).toBe('jeton-signe');
    expect(users.reinitialiserEchecs).toHaveBeenCalledWith(1);
  });

  it('remet le compteur a zero apres une connexion reussie', async () => {
    users.trouverParIdentifiant.mockResolvedValue({ ...utilisateur, tentatives_echouees: 3 });
    passwords.verify.mockResolvedValue(true);
    await service.connecter('TEST-0001', 'bon');
    expect(users.reinitialiserEchecs).toHaveBeenCalledWith(1);
  });

  it('rafraichit la session : nouveau jeton d acces et nouveau jeton de session', async () => {
    sessions.renouveler.mockResolvedValue({ userId: 1, jeton: 'refresh-2', expireLe });
    users.trouverParId.mockResolvedValue(utilisateur);
    const res = await service.rafraichir('refresh-1');
    expect(sessions.renouveler).toHaveBeenCalledWith('refresh-1');
    expect(res.accessToken).toBe('jeton-signe');
    expect(res.refresh).toEqual({ jeton: 'refresh-2', expireLe });
  });

  it('coupe la session quand le compte a ete desactive', async () => {
    sessions.renouveler.mockResolvedValue({ userId: 1, jeton: 'refresh-2', expireLe });
    users.trouverParId.mockResolvedValue({ ...utilisateur, actif: false });
    await expect(service.rafraichir('refresh-1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.revoquer).toHaveBeenCalledWith('refresh-2');
    expect(tokens.signerAcces).not.toHaveBeenCalled();
  });

  it('revoque la session a la deconnexion', async () => {
    await service.deconnecter('refresh-1');
    expect(sessions.revoquer).toHaveBeenCalledWith('refresh-1');
  });
});