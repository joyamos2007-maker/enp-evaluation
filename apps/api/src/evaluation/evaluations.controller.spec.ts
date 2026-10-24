import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EvaluationsController } from './evaluations.controller';

describe('EvaluationsController', () => {
  const evaluations = { aFaire: jest.fn(), questionnaire: jest.fn() };
  const jetons = { emettre: jest.fn() };
  const controller = new EvaluationsController(
    evaluations as never,
    jetons as never,
  );
  const etudiant = {
    headers: {},
    utilisateur: { id: 42, roles: ['etudiant'] },
  };
  const delegue = { headers: {}, utilisateur: { id: 43, roles: ['delegue'] } };

  beforeEach(() => jest.resetAllMocks());

  it('utilise l identifiant de l utilisateur connecte', () => {
    evaluations.aFaire.mockResolvedValue([]);
    void controller.aFaire(etudiant);
    expect(evaluations.aFaire).toHaveBeenCalledWith(42);
  });

  it('utilise l identifiant du délégué connecté pour vérifier ses inscriptions', () => {
    evaluations.aFaire.mockResolvedValue([]);
    void controller.aFaire(delegue);
    expect(evaluations.aFaire).toHaveBeenCalledWith(43);
  });

  it('refuse quand aucun utilisateur n est identifie', () => {
    expect(() => controller.aFaire({ headers: {} })).toThrow(
      UnauthorizedException,
    );
    expect(evaluations.aFaire).not.toHaveBeenCalled();
  });

  it('refuse un campagneId absent ou invalide', () => {
    for (const mauvais of [undefined, '', 'abc', '0']) {
      expect(() => controller.questionnaire(mauvais)).toThrow(
        BadRequestException,
      );
    }
    expect(evaluations.questionnaire).not.toHaveBeenCalled();
  });

  it('transmet un campagneId valide', () => {
    evaluations.questionnaire.mockResolvedValue({});
    void controller.questionnaire('7');
    expect(evaluations.questionnaire).toHaveBeenCalledWith(7);
  });

  it('emet un jeton pour l utilisateur connecte', async () => {
    jetons.emettre.mockResolvedValue({ jeton: 'j', expireDans: 3600 });
    await controller.jeton('7', { campagneId: 3 }, etudiant);
    expect(jetons.emettre).toHaveBeenCalledWith(42, 7, 3);
  });

  it('vérifie l inscription du délégué avant de demander un jeton', async () => {
    jetons.emettre.mockResolvedValue({ jeton: 'j', expireDans: 3600 });
    await controller.jeton('7', { campagneId: 3 }, delegue);
    expect(jetons.emettre).toHaveBeenCalledWith(43, 7, 3);
  });

  it('ignore tout identifiant d etudiant fourni dans le corps', async () => {
    jetons.emettre.mockResolvedValue({});
    await controller.jeton(
      '7',
      { campagneId: 3, studentId: 999, userId: 999 },
      etudiant,
    );
    expect(jetons.emettre).toHaveBeenCalledWith(42, 7, 3);
  });

  it('refuse l emission sans utilisateur identifie', async () => {
    await expect(
      controller.jeton('7', { campagneId: 3 }, { headers: {} }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jetons.emettre).not.toHaveBeenCalled();
  });

  it('refuse des identifiants invalides pour l emission', async () => {
    const mauvais: [string, unknown][] = [
      ['abc', { campagneId: 3 }],
      ['0', { campagneId: 3 }],
      ['7', {}],
      ['7', null],
      ['7', { campagneId: '3' }],
      ['7', { campagneId: 0 }],
      ['7', { campagneId: 1.5 }],
    ];
    for (const [ue, corps] of mauvais) {
      await expect(
        controller.jeton(ue, corps, etudiant),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(jetons.emettre).not.toHaveBeenCalled();
  });
});
