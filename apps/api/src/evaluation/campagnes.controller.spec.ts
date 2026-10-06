import { BadRequestException } from '@nestjs/common';
import { CampagnesController } from './campagnes.controller';

describe('CampagnesController', () => {
  const campagnes = {
    creer: jest.fn(),
    lister: jest.fn(),
    trouver: jest.fn(),
    ouvrir: jest.fn(),
    cloturer: jest.fn(),
  };
  const controller = new CampagnesController(campagnes as never);
  const corpsValide = {
    libelle: 'Evaluation S5',
    departmentId: 1,
    anneeUniversitaire: '2026-2027',
    semestre: 5,
    debut: '2026-10-01T00:00:00Z',
    fin: '2099-12-15T00:00:00Z',
  };

  beforeEach(() => jest.resetAllMocks());

  it('refuse un corps invalide sans appeler le service', async () => {
    await expect(controller.creer({ libelle: '' })).rejects.toBeInstanceOf(BadRequestException);
    expect(campagnes.creer).not.toHaveBeenCalled();
  });

  it('transmet une campagne valide au service avec de vraies dates', async () => {
    campagnes.creer.mockResolvedValue({ id: 1 });
    await controller.creer(corpsValide);
    const entree = campagnes.creer.mock.calls[0][0];
    expect(entree.debut).toBeInstanceOf(Date);
    expect(entree.departmentId).toBe(1);
  });

  it('refuse un identifiant invalide', () => {
    expect(() => controller.detail('abc')).toThrow(BadRequestException);
    expect(() => controller.ouvrir('0')).toThrow(BadRequestException);
    expect(() => controller.cloturer('1; DROP TABLE')).toThrow(BadRequestException);
    expect(campagnes.trouver).not.toHaveBeenCalled();
  });

  it('ouvre et cloture avec un identifiant numerique', async () => {
    campagnes.ouvrir.mockResolvedValue({ id: 5 });
    campagnes.cloturer.mockResolvedValue({ id: 5 });
    await controller.ouvrir('5');
    await controller.cloturer('5');
    expect(campagnes.ouvrir).toHaveBeenCalledWith(5);
    expect(campagnes.cloturer).toHaveBeenCalledWith(5);
  });
});