import { ROLES_KEY } from '../auth/roles.decorator';
import { DirectionEtudesController } from './direction-etudes.controller';

describe('DirectionEtudesController', () => {
  const direction = {
    synthese: jest.fn(),
    publier: jest.fn(),
    controlesAcademiques: jest.fn(),
  };
  const campusScope = { forDirecteurCampus: jest.fn() };
  const controller = new DirectionEtudesController(
    direction as never,
    campusScope as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('limite les statistiques du Directeur de campus à son campus', async () => {
    campusScope.forDirecteurCampus.mockResolvedValue(4);
    direction.synthese.mockResolvedValue({});
    await controller.statistiques(
      {
        headers: {},
        utilisateur: {
          id: 8,
          roles: ['directeur_campus'],
          activeRole: 'directeur_campus',
        },
      },
      '2026-2027',
      '5',
    );
    expect(campusScope.forDirecteurCampus).toHaveBeenCalledWith(8, ['directeur_campus']);
    expect(direction.synthese).toHaveBeenCalledWith(
      { anneeUniversitaire: '2026-2027', semestre: 5 },
      4,
    );
  });

  it('laisse la synthèse multisite au Directeur général', async () => {
    direction.synthese.mockResolvedValue({});
    await controller.statistiques(
      {
        headers: {},
        utilisateur: {
          id: 2,
          roles: ['directeur_general'],
          activeRole: 'directeur_general',
        },
      },
      '2026-2027',
      '5',
    );
    expect(direction.synthese).toHaveBeenCalledWith(
      { anneeUniversitaire: '2026-2027', semestre: 5 },
      null,
    );
    expect(campusScope.forDirecteurCampus).not.toHaveBeenCalled();
  });

  it('réserve la publication des statistiques globales au Directeur général', () => {
    const handler = Object.getOwnPropertyDescriptor(
      DirectionEtudesController.prototype,
      'publier',
    )?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['directeur_general']);
  });

  it('limite les contrôles du Directeur de campus à son campus', async () => {
    campusScope.forDirecteurCampus.mockResolvedValue(4);
    direction.controlesAcademiques.mockResolvedValue({});
    await controller.controles(
      {
        headers: {},
        utilisateur: {
          id: 8,
          roles: ['directeur_campus'],
          activeRole: 'directeur_campus',
        },
      },
      '2026-2027',
      '5',
    );
    expect(direction.controlesAcademiques).toHaveBeenCalledWith(
      { anneeUniversitaire: '2026-2027', semestre: 5 },
      4,
    );
  });
});
