import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ModerationController } from './moderation.controller';

const BALLOT = '3d2ffb41-1f7c-464c-bccf-0d9ca21a3958';

describe('ModerationController', () => {
  const moderation = { lister: jest.fn(), decider: jest.fn() };
  const controller = new ModerationController(moderation as never);
  const sco = { headers: {}, utilisateur: { id: 2, roles: ['scolarite'] } };

  beforeEach(() => jest.resetAllMocks());

  it('liste les commentaires d une campagne avec un filtre facultatif', () => {
    moderation.lister.mockResolvedValue([]);
    controller.lister('3', 'valide');
    controller.lister('3', undefined);
    expect(moderation.lister).toHaveBeenNthCalledWith(1, 3, 'valide');
    expect(moderation.lister).toHaveBeenNthCalledWith(2, 3, undefined);
  });

  it('refuse un campagneId absent ou invalide, et un statut inconnu', () => {
    for (const mauvais of [undefined, '', 'abc', '0']) {
      expect(() => controller.lister(mauvais, undefined)).toThrow(BadRequestException);
    }
    expect(() => controller.lister('3', 'zzz')).toThrow(BadRequestException);
    expect(moderation.lister).not.toHaveBeenCalled();
  });

  it('applique une decision au nom de l utilisateur connecte', async () => {
    moderation.decider.mockResolvedValue({ id: BALLOT + '.points_forts' });
    await controller.decider(BALLOT + '.points_forts', { statut: 'masque' }, sco);
    expect(moderation.decider).toHaveBeenCalledWith(
      { ballotId: BALLOT, type: 'points_forts' },
      'masque',
      2,
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