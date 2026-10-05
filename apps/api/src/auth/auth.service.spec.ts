import { HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = {
    trouverParIdentifiant: jest.fn(),
    rolesDe: jest.fn(),
    enregistrerEchec: jest.fn(),
    reinitialiserEchecs: jest.fn(),
  };
  const passwords = { verify: jest.fn(), hash: jest.fn() };
  const tokens = { signerAcces: jest.fn() };
  const service = new AuthService(users as never, passwords as never, tokens as never);

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
  });

  it('connecte un utilisateur valide', async () => {
    users.trouverParIdentifiant.mockResolvedValue(utilisateur);
    passwords.verify.mockResolvedValue(true);
    const res = await service.connecter('TEST-0001', 'bon');
    expect(res.accessToken).toBe('jeton-signe');
    expect(res.utilisateur).toEqual({ id: 1, nom: 'TEST', prenom: 'Etudiant', roles: ['etudiant'] });
    expect(tokens.signerAcces).toHaveBeenCalledWith({ sub: '1', roles: ['etudiant'] });
    expect(users.reinitialiserEchecs).not.toHaveBeenCalled();
  });

  it('refuse un mauvais mot de passe et enregistre l echec', async () => {
    users.trouverParIdentifiant.mockResolvedValue(utilisateur);
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('TEST-0001', 'mauvais')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.enregistrerEchec).toHaveBeenCalledWith(1);
    expect(tokens.signerAcces).not.toHaveBeenCalled();
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
});