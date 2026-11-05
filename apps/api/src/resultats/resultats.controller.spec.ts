import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ResultatsController } from './resultats.controller';

describe('ResultatsController', () => {
  const resultats = { mesUes: jest.fn(), fiche: jest.fn() };
  const campusScope = {
    forScolarite: jest.fn(),
    forDirecteurCampus: jest.fn(),
    forChefDepartement: jest.fn(),
  };
  const controller = new ResultatsController(
    resultats as never,
    campusScope as never,
  );
  const ens = {
    headers: {},
    utilisateur: {
      id: 30,
      roles: ['enseignant'],
      activeRole: 'enseignant',
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forChefDepartement.mockResolvedValue(12);
  });

  it('autorise la liste des résultats aux rôles métier, pas à l’administration technique', () => {
    const handler = Object.getOwnPropertyDescriptor(
      ResultatsController.prototype,
      'mesUes',
    )?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'enseignant',
      'chef_departement',
      'scolarite',
      'directeur_campus',
      'directeur_general',
    ]);
  });

  it('autorise la lecture des résultats à leurs rôles métier, pas à l’administration technique', () => {
    const handler = Object.getOwnPropertyDescriptor(
      ResultatsController.prototype,
      'fiche',
    )?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'enseignant',
      'chef_departement',
      'scolarite',
      'directeur_campus',
      'directeur_general',
    ]);
  });

  it('liste les UE de l utilisateur connecte', async () => {
    resultats.mesUes.mockResolvedValue([]);
    await controller.mesUes(ens);
    expect(resultats.mesUes).toHaveBeenCalledWith(
      30,
      ['enseignant'],
      null,
      null,
    );
  });

  it('limite la liste des résultats au périmètre du profil actif', async () => {
    const scolarite = {
      headers: {},
      utilisateur: {
        id: 45,
        roles: ['scolarite', 'directeur_general'],
        activeRole: 'scolarite',
      },
    };
    resultats.mesUes.mockResolvedValue([]);
    campusScope.forScolarite.mockResolvedValue(7);

    await controller.mesUes(scolarite);

    expect(campusScope.forScolarite).toHaveBeenCalledWith(45, ['scolarite']);
    expect(resultats.mesUes).toHaveBeenCalledWith(45, ['scolarite'], 7, null);
  });

  it('refuse quand aucun utilisateur n est identifie', async () => {
    await expect(controller.mesUes({ headers: {} })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      controller.fiche('1', '3', { headers: {} }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(resultats.mesUes).not.toHaveBeenCalled();
    expect(resultats.fiche).not.toHaveBeenCalled();
  });

  it('transmet uniquement le campus du profil Directeur de campus', async () => {
    resultats.mesUes.mockResolvedValue([]);
    campusScope.forDirecteurCampus.mockResolvedValue(8);
    await controller.mesUes({
      headers: {},
      utilisateur: {
        id: 18,
        roles: ['directeur_campus', 'enseignant'],
        activeRole: 'directeur_campus',
      },
    });
    expect(campusScope.forDirecteurCampus).toHaveBeenCalledWith(18, ['directeur_campus']);
    expect(resultats.mesUes).toHaveBeenCalledWith(
      18,
      ['directeur_campus'],
      8,
      null,
    );
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
      await expect(controller.fiche(ue, campagne, ens)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(resultats.fiche).not.toHaveBeenCalled();
  });

  it('transmet l utilisateur, l UE et la campagne', async () => {
    resultats.fiche.mockResolvedValue({ ueId: 1 });
    const res = await controller.fiche('1', '3', ens);
    expect(resultats.fiche).toHaveBeenCalledWith(
      { ...ens.utilisateur, roles: ['enseignant'] },
      1,
      3,
      null,
      null,
    );
    expect(res).toEqual({ ueId: 1 });
  });

  it('n’accorde pas le périmètre complet d’un autre rôle au profil actif', async () => {
    const enseignantAvecAdmin = {
      headers: {},
      utilisateur: {
        id: 30,
        roles: ['enseignant', 'admin'],
        activeRole: 'enseignant',
      },
    };
    resultats.fiche.mockResolvedValue({ ueId: 1 });

    await controller.fiche('1', '3', enseignantAvecAdmin);

    expect(campusScope.forScolarite).not.toHaveBeenCalled();
    expect(resultats.fiche).toHaveBeenCalledWith(
      { id: 30, roles: ['enseignant'], activeRole: 'enseignant' },
      1,
      3,
      null,
      null,
    );
  });

  it('limite le Chef de département à son périmètre', async () => {
    const chef = {
      headers: {},
      utilisateur: {
        id: 45,
        roles: ['chef_departement'],
        activeRole: 'chef_departement',
      },
    };
    resultats.fiche.mockResolvedValue({ ueId: 1 });
    await controller.fiche('1', '3', chef);
    expect(campusScope.forChefDepartement).toHaveBeenCalledWith(45, [
      'chef_departement',
    ]);
    expect(resultats.fiche).toHaveBeenCalledWith(
      { ...chef.utilisateur, roles: ['chef_departement'] },
      1,
      3,
      null,
      12,
    );
  });
});
