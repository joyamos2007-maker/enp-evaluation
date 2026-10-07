import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ResultatsController } from './resultats.controller';

describe('ResultatsController', () => {
  const resultats = { mesUes: jest.fn(), fiche: jest.fn() };
  const controller = new ResultatsController(resultats as never);
  const ens = { headers: {}, utilisateur: { id: 30, roles: ['enseignant'] } };

  beforeEach(() => jest.resetAllMocks());

  it('liste les UE de l utilisateur connecte', () => {
    resultats.mesUes.mockResolvedValue([]);
    controller.mesUes(ens);
    expect(resultats.mesUes).toHaveBeenCalledWith(30);
  });

  it('refuse quand aucun utilisateur n est identifie', async () => {
    expect(() => controller.mesUes({ headers: {} })).toThrow(UnauthorizedException);
    await expect(controller.fiche('1', '3', { headers: {} })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(resultats.mesUes).not.toHaveBeenCalled();
    expect(resultats.fiche).not.toHaveBeenCalled();
  });

  it('refuse des identifiants invalides', async () => {
    const mauvais: [string, string | undefined][] = [
      ['abc', '3'],
      ['0', '3'],
      ['1', undefined],
      ['1', 'x'],
      ['1', '0'],
    ];
    for (const [ue, campagne] of mauvais) {
      await expect(controller.fiche(ue, campagne, ens)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(resultats.fiche).not.toHaveBeenCalled();
  });

  it('transmet l utilisateur, l UE et la campagne', async () => {
    resultats.fiche.mockResolvedValue({ ueId: 1 });
    const res = await controller.fiche('1', '3', ens);
    expect(resultats.fiche).toHaveBeenCalledWith({ id: 30, roles: ['enseignant'] }, 1, 3);
    expect(res).toEqual({ ueId: 1 });
  });
});