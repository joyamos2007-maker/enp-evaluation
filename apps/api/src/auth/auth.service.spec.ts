import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users = { trouverParIdentifiant: jest.fn(), rolesDe: jest.fn() };
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
  });

  it('refuse un mauvais mot de passe', async () => {
    users.trouverParIdentifiant.mockResolvedValue(utilisateur);
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('TEST-0001', 'mauvais')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokens.signerAcces).not.toHaveBeenCalled();
  });

  it('refuse un identifiant inconnu en verifiant quand meme une empreinte factice', async () => {
    users.trouverParIdentifiant.mockResolvedValue(null);
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('inconnu', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.verify).toHaveBeenCalledWith('empreinte-factice', 'x');
  });

  it('refuse un compte desactive', async () => {
    users.trouverParIdentifiant.mockResolvedValue({ ...utilisateur, actif: false });
    passwords.verify.mockResolvedValue(true);
    await expect(service.connecter('TEST-0001', 'bon')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un compte pas encore active (sans mot de passe)', async () => {
    users.trouverParIdentifiant.mockResolvedValue({ ...utilisateur, mot_de_passe_hash: null });
    passwords.verify.mockResolvedValue(false);
    await expect(service.connecter('TEST-0001', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});