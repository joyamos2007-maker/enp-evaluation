import { ROLES_KEY } from '../auth/roles.decorator';
import { ComptesController } from './comptes.controller';

describe('ComptesController', () => {
  const users = {
    listerComptes: jest.fn(),
    supprimerCompte: jest.fn(),
  };
  const campusScope = { forScolarite: jest.fn() };
  const controller = new ComptesController(users as never, campusScope as never);

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(7);
  });

  it('limite la suppression aux profils admin et Scolarité', async () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ComptesController.prototype.supprimer,
      ),
    ).toEqual(['scolarite', 'admin']);
    users.supprimerCompte.mockResolvedValue(undefined);

    await controller.supprimer(15, {
      headers: {},
      utilisateur: { id: 8, roles: ['scolarite'], activeRole: 'scolarite' },
    });

    expect(campusScope.forScolarite).toHaveBeenCalledWith(8, ['scolarite']);
    expect(users.supprimerCompte).toHaveBeenCalledWith(15, 8, 'scolarite', 7);
  });

  it('ne résout pas de campus pour l’administration', async () => {
    users.supprimerCompte.mockResolvedValue(undefined);

    await controller.supprimer(15, {
      headers: {},
      utilisateur: { id: 8, roles: ['admin'], activeRole: 'admin' },
    });

    expect(campusScope.forScolarite).not.toHaveBeenCalled();
    expect(users.supprimerCompte).toHaveBeenCalledWith(15, 8, 'admin', null);
  });
});
