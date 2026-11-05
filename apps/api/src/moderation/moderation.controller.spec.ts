import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ModerationController } from './moderation.controller';

const BALLOT = '3d2ffb41-1f7c-464c-bccf-0d9ca21a3958';

describe('ModerationController', () => {
  const moderation = { lister: jest.fn(), decider: jest.fn() };
  const campusScope = {
    forScolarite: jest.fn(),
    forDirecteurCampus: jest.fn(),
  };
  const controller = new ModerationController(moderation as never, campusScope as never);
  const sco = {
    headers: {},
    utilisateur: { id: 2, roles: ['scolarite'], activeRole: 'scolarite' },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(9);
  });

  it('autorise la Direction à lire les commentaires, mais réserve les décisions à la Scolarité', async () => {
    const prototype = ModerationController.prototype;
    const handler = (name: string) =>
      Object.getOwnPropertyDescriptor(prototype, name)?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler('lister'))).toEqual([
      'scolarite',
      'directeur_campus',
      'directeur_general',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler('decider'))).toEqual([
      'scolarite',
    ]);

    moderation.lister.mockResolvedValue([]);
    await controller.lister('3', undefined, {
      headers: {},
      utilisateur: {
        id: 2,
        roles: ['directeur_general'],
        activeRole: 'directeur_general',
      },
    });
    expect(campusScope.forScolarite).not.toHaveBeenCalled();
    expect(moderation.lister).toHaveBeenCalledWith(3, undefined, null);
  });

  it('liste les commentaires d une campagne avec un filtre facultatif', async () => {
    moderation.lister.mockResolvedValue([]);
    await controller.lister('3', 'valide', sco);
    await controller.lister('3', undefined, sco);
    expect(moderation.lister).toHaveBeenNthCalledWith(1, 3, 'valide', 9);
    expect(moderation.lister).toHaveBeenNthCalledWith(2, 3, undefined, 9);
  });

  it('limite la lecture des commentaires du Directeur de campus à son campus', async () => {
    campusScope.forDirecteurCampus.mockResolvedValue(9);
    moderation.lister.mockResolvedValue([]);
    await controller.lister('3', undefined, {
      headers: {},
      utilisateur: {
        id: 6,
        roles: ['directeur_campus'],
        activeRole: 'directeur_campus',
      },
    });
    expect(campusScope.forDirecteurCampus).toHaveBeenCalledWith(6, ['directeur_campus']);
    expect(moderation.lister).toHaveBeenCalledWith(3, undefined, 9);
  });

  it('refuse un campagneId absent ou invalide, et un statut inconnu', async () => {
    for (const mauvais of [undefined, '', 'abc', '0']) {
      await expect(controller.lister(mauvais, undefined, sco)).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(controller.lister('3', 'zzz', sco)).rejects.toBeInstanceOf(BadRequestException);
    expect(moderation.lister).not.toHaveBeenCalled();
  });

  it('applique une decision au nom de l utilisateur connecte', async () => {
    moderation.decider.mockResolvedValue({ id: BALLOT + '.points_forts' });
    await controller.decider(BALLOT + '.points_forts', { statut: 'masque' }, sco);
    expect(moderation.decider).toHaveBeenCalledWith(
      { ballotId: BALLOT, type: 'points_forts' },
      'masque',
      2,
      9,
    );
  });

  it('refuse sans utilisateur identifie', async () => {
    await expect(
      controller.decider(BALLOT + '.points_forts', { statut: 'masque' }, { headers: {} }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(moderation.decider).not.toHaveBeenCalled();
  });

  it('refuse un identifiant ou une decision invalides', async () => {
    await expect(controller.decider('abc', { statut: 'valide' }, sco)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.decider(BALLOT + '.points_forts', { statut: 'a_moderer' }, sco),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.decider(BALLOT + '.points_forts', null, sco)).rejects.toBeInstanceOf(BadRequestException);
    expect(moderation.decider).not.toHaveBeenCalled();
  });
});