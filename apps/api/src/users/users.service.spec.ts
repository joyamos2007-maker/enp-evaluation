import { UsersService } from './users.service';

describe('UsersService', () => {
  const db = { query: jest.fn() };
  const service = new UsersService(db as never);

  beforeEach(() => db.query.mockReset());

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
});