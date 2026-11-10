import { BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { CahierTexteController } from './cahier-texte.controller';

describe('CahierTexteController', () => {
  const cahier = {
    mesUes: jest.fn(),
    seances: jest.fn(),
    creer: jest.fn(),
    modifier: jest.fn(),
    viser: jest.fn(),
    avancement: jest.fn(),
  };
  const campusScope = {
    forScolarite: jest.fn(),
    forChefDepartement: jest.fn(),
    forDirecteurCampus: jest.fn(),
  };
  const controller = new CahierTexteController(cahier as never, campusScope as never);
  const delegue = {
    headers: {},
    utilisateur: { id: 12, roles: ['delegue'], activeRole: 'delegue' },
  };
  const enseignant = {
    headers: {},
    utilisateur: { id: 24, roles: ['enseignant'], activeRole: 'enseignant' },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(9);
    campusScope.forChefDepartement.mockResolvedValue(14);
    campusScope.forDirecteurCampus.mockResolvedValue(8);
  });

  it('protège la création et modification pour les délégués, le visa pour les enseignants', () => {
    const prototype = CahierTexteController.prototype;
    const handler = (name: string) =>
      Object.getOwnPropertyDescriptor(prototype, name)?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler('creer'))).toEqual([
      'delegue',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler('modifier'))).toEqual([
      'delegue',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler('viser'))).toEqual([
      'enseignant',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler('mesUes'))).toEqual([
      'delegue',
      'enseignant',
      'etudiant',
      'scolarite',
      'chef_departement',
      'directeur_campus',
      'directeur_general',
    ]);
  });

  it('valide les paramètres et transmet le périmètre pour les lectures', async () => {
    cahier.mesUes.mockResolvedValue([]);
    await controller.mesUes(delegue);
    expect(cahier.mesUes).toHaveBeenCalledWith(12, ['delegue'], null, null);
    await expect(controller.seances(delegue, 'invalid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await controller.seances(enseignant, undefined, 'en_attente');
    expect(cahier.seances).toHaveBeenCalledWith(
      24,
      ['enseignant'],
      undefined,
      'en_attente',
      null,
      null,
    );
  });

  it('limite les lectures au campus Scolarité ou au département du Chef', async () => {
    const scolarite = {
      headers: {},
      utilisateur: {
        id: 33,
        roles: ['scolarite', 'admin'],
        activeRole: 'scolarite',
      },
    };
    const chef = {
      headers: {},
      utilisateur: {
        id: 44,
        roles: ['chef_departement'],
        activeRole: 'chef_departement',
      },
    };

    await controller.mesUes(scolarite);
    await controller.seances(chef);

    expect(campusScope.forScolarite).toHaveBeenCalledWith(33, ['scolarite']);
    expect(cahier.mesUes).toHaveBeenCalledWith(33, ['scolarite'], 9, null);
    expect(campusScope.forChefDepartement).toHaveBeenCalledWith(44, [
      'chef_departement',
    ]);
    expect(cahier.seances).toHaveBeenCalledWith(
      44,
      ['chef_departement'],
      undefined,
      undefined,
      null,
      14,
    );
  });

  it('permet les statistiques de volume horaire dans le périmètre direction', async () => {
    const directeur = {
      headers: {},
      utilisateur: {
        id: 51,
        roles: ['directeur_campus'],
        activeRole: 'directeur_campus',
      },
    };
    cahier.avancement.mockResolvedValue({});

    await controller.avancement(directeur, '5');

    expect(campusScope.forDirecteurCampus).toHaveBeenCalledWith(51, [
      'directeur_campus',
    ]);
    expect(cahier.avancement).toHaveBeenCalledWith(
      51,
      ['directeur_campus'],
      5,
      8,
      null,
    );
    const handler = Object.getOwnPropertyDescriptor(
      CahierTexteController.prototype,
      'avancement',
    )?.value;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toContain('scolarite');
  });

  it('rejette une séance tenue sans intitulé ni contenu', () => {
    expect(
      () =>
        void controller.creer(delegue, {
          ueId: 5,
          date: '2026-10-13',
          debut: '08:00',
          fin: '10:00',
          type: 'CM',
          statut: 'tenue',
        }),
    ).toThrow(BadRequestException);
    expect(cahier.creer).not.toHaveBeenCalled();
  });

  it('accepte une contestation uniquement avec un commentaire', () => {
    expect(() =>
      controller.viser(enseignant, '8', { decision: 'conteste' }),
    ).toThrow(BadRequestException);
    void controller.viser(enseignant, '8', { decision: 'vise' });
    expect(cahier.viser).toHaveBeenCalledWith(24, 8, 'vise', undefined);
  });

  it('permet de planifier une séance future mais refuse une séance tenue future', () => {
    const future = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    void controller.creer(delegue, {
      ueId: 5,
      date: future,
      debut: '08:00',
      fin: '10:00',
      type: 'CM',
      statut: 'planifiee',
    });
    expect(cahier.creer).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ statut: 'planifiee' }),
    );
    expect(() =>
      controller.creer(delegue, {
        ueId: 5,
        date: future,
        debut: '08:00',
        fin: '10:00',
        type: 'CM',
        statut: 'tenue',
        intitule: 'Séance future',
        contenu: 'Contenu',
      }),
    ).toThrow(BadRequestException);
  });
});
