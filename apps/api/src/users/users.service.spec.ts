import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  const query = jest.fn();
  const db = {
    query: jest.fn(),
    transaction: jest.fn((work: (queryFn: typeof query) => Promise<unknown>) =>
      work(query),
    ),
  };
  const audit = { enregistrerDans: jest.fn() };
  const service = new UsersService(db as never, audit as never);

  beforeEach(() => {
    db.query.mockReset();
    db.transaction.mockClear();
    query.mockReset();
    audit.enregistrerDans.mockReset();
  });

  it('retourne null quand aucun utilisateur ne correspond', async () => {
    db.query.mockResolvedValue([]);
    await expect(service.trouverParIdentifiant('inconnu')).resolves.toBeNull();
  });

  it('retourne l utilisateur trouve', async () => {
    db.query.mockResolvedValue([{ id: 1, nom: 'TEST' }]);
    await expect(service.trouverParIdentifiant('TEST-0001')).resolves.toMatchObject({ id: 1 });
  });

  it('retrouve un utilisateur par son identifiant numerique', async () => {
    db.query.mockResolvedValueOnce([{ id: 4, nom: 'TEST' }]).mockResolvedValueOnce([]);
    await expect(service.trouverParId(4)).resolves.toMatchObject({ id: 4 });
    await expect(service.trouverParId(99)).resolves.toBeNull();
  });

  it('n’accepte pas les comptes supprimés pour une authentification', async () => {
    db.query.mockResolvedValue([]);
    await service.trouverParIdentifiant('ancien-compte');
    await service.trouverParId(10);
    expect(db.query.mock.calls[0][0]).toContain('deleted_at IS NULL');
    expect(db.query.mock.calls[1][0]).toContain('deleted_at IS NULL');
  });

  it('liste les roles', async () => {
    db.query.mockResolvedValue([{ role: 'etudiant' }, { role: 'delegue' }]);
    await expect(service.rolesDe(1)).resolves.toEqual(['etudiant', 'delegue']);
  });

  it('enregistre un echec avec le seuil et la duree de verrouillage', async () => {
    db.query.mockResolvedValue([]);
    await service.enregistrerEchec(7);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([7, 5, 15]);
  });

  it('remet le compteur d echecs a zero', async () => {
    db.query.mockResolvedValue([]);
    await service.reinitialiserEchecs(7);
    expect(db.query.mock.calls[0][0]).toContain('tentatives_echouees = 0');
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });

  it('anonymise, révoque les sessions, efface les rôles et trace la suppression dans la même transaction', async () => {
    query
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([{ role: 'enseignant' }, { role: 'etudiant' }])
      .mockResolvedValue([]);

    await service.supprimerCompte(20, 1, 'admin', null);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('deleted_at = NOW()'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE identity.refresh_tokens'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM identity.user_roles'))).toBe(true);
    expect(audit.enregistrerDans).toHaveBeenCalledWith(
      query,
      expect.objectContaining({
        userId: 1,
        action: 'suppression_compte',
        objet: 'compte:20',
      }),
    );
  });

  it('refuse la suppression de son propre compte avant toute transaction', async () => {
    await expect(service.supprimerCompte(1, 1, 'admin', null)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('refuse une suppression Scolarité hors périmètre et ne crée pas de trace de succès', async () => {
    query
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([{ role: 'etudiant' }])
      .mockResolvedValueOnce([{ autorise: false }]);

    await expect(service.supprimerCompte(20, 1, 'scolarite', 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(audit.enregistrerDans).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('deleted_at = NOW()'))).toBe(false);
  });

  it('protège le dernier compte administrateur', async () => {
    query
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([{ role: 'admin' }])
      .mockResolvedValueOnce([{ id: 1 }]);

    await expect(service.supprimerCompte(20, 1, 'admin', null)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(audit.enregistrerDans).not.toHaveBeenCalled();
  });
});