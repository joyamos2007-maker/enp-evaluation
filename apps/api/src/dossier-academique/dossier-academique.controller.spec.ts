import { BadRequestException } from '@nestjs/common';
import { DossierAcademiqueController } from './dossier-academique.controller';

describe('DossierAcademiqueController', () => {
  const dossier = {
    creerEvaluation: jest.fn(),
    enregistrerPresences: jest.fn(),
    exporterNotes: jest.fn(),
  };
  const controller = new DossierAcademiqueController(dossier as never);
  const requete = { utilisateur: { id: 43, roles: ['enseignant'] } } as never;

  beforeEach(() => jest.resetAllMocks());

  it('refuse la création d’une colonne de type examen', () => {
    expect(() =>
      controller.creerEvaluation(requete, '20', {
        libelle: 'Examen final',
        type: 'examen',
        bareme: 50,
      }),
    ).toThrow(BadRequestException);
    expect(dossier.creerEvaluation).not.toHaveBeenCalled();
  });

  it('accepte les barèmes décimaux valides malgré la représentation flottante', async () => {
    dossier.creerEvaluation.mockResolvedValueOnce({ id: 1 });
    await expect(
      controller.creerEvaluation(requete, '20', {
        libelle: 'Devoir 1',
        bareme: 0.29,
      }),
    ).resolves.toEqual({ id: 1 });
    expect(dossier.creerEvaluation).toHaveBeenCalledWith(43, 20, {
      libelle: 'Devoir 1',
      bareme: 0.29,
    });
  });

  it('refuse les statuts de présence non prévus', () => {
    expect(() =>
      controller.enregistrerPresences(requete, '8', {
        etudiants: [{ etudiantId: 71, statut: 'excuse' }],
      }),
    ).toThrow(BadRequestException);
    expect(dossier.enregistrerPresences).not.toHaveBeenCalled();
  });

  it('refuse les notes avec une précision supérieure à deux décimales', () => {
    expect(() =>
      controller.enregistrerNotes(requete, '12', {
        etudiants: [{ etudiantId: 71, note: 12.345 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('refuse un format d’export non pris en charge', async () => {
    await expect(
      controller.exporterNotes(requete, '20', 'csv'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dossier.exporterNotes).not.toHaveBeenCalled();
  });
});
