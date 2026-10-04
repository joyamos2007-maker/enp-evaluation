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

  it('liste les roles', async () => {
    db.query.mockResolvedValue([{ role: 'etudiant' }, { role: 'delegue' }]);
    await expect(service.rolesDe(1)).resolves.toEqual(['etudiant', 'delegue']);
  });
});