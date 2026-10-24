import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RestitutionController } from './restitution.controller';

describe('RestitutionController', () => {
  const restitution = { publier: jest.fn(), pourEtudiant: jest.fn() };
  const campusScope = { forScolarite: jest.fn() };
  const controller = new RestitutionController(restitution as never, campusScope as never);
  const sco = { headers: {}, utilisateur: { id: 2, roles: ['scolarite'] } };
  const etu = { headers: {}, utilisateur: { id: 42, roles: ['etudiant'] } };
  const corps = { resultats: 'R', suites: 'S' };

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(9);
  });

  it('publie la restitution au nom de l utilisateur connecte', async () => {
    restitution.publier.mockResolvedValue({ id: 3, statut: 'restituee' });
    const res = await controller.publier('3', corps, sco);
    expect(restitution.publier).toHaveBeenCalledWith(3, 2, { resultats: 'R', suites: 'S' }, 9);
    expect(res).toEqual({ id: 3, statut: 'restituee' });
  });

  it('refuse sans utilisateur identifie', async () => {
    await expect(controller.publier('3', corps, { headers: {} })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(() => controller.mesRestitutions({ headers: {} })).toThrow(UnauthorizedException);
    expect(restitution.publier).not.toHaveBeenCalled();
    expect(restitution.pourEtudiant).not.toHaveBeenCalled();
  });

  it('refuse un identifiant ou un corps invalide, sans appeler le service', async () => {
    await expect(controller.publier('abc', corps, sco)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.publier('3', {}, sco)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.publier('3', { resultats: 'R', suites: '  ' }, sco)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(restitution.publier).not.toHaveBeenCalled();
  });

  it('liste les restitutions de l etudiant connecte', () => {
    restitution.pourEtudiant.mockResolvedValue([]);
    controller.mesRestitutions(etu);
    expect(restitution.pourEtudiant).toHaveBeenCalledWith(42);
  });
});