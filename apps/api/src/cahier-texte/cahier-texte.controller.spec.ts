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
  const controller = new CahierTexteController(cahier as never);
  const delegue = { headers: {}, utilisateur: { id: 12, roles: ['delegue'] } };
  const enseignant = {
    headers: {},
    utilisateur: { id: 24, roles: ['enseignant'] },
  };

  beforeEach(() => jest.resetAllMocks());

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
  });

  it('valide les paramètres et transmet le périmètre pour les lectures', () => {
    cahier.mesUes.mockResolvedValue([]);
    void controller.mesUes(delegue);
    expect(cahier.mesUes).toHaveBeenCalledWith(12, ['delegue']);
    expect(() => controller.seances(delegue, 'invalid')).toThrow(
      BadRequestException,
    );
    void controller.seances(enseignant, undefined, 'en_attente');
    expect(cahier.seances).toHaveBeenCalledWith(
      24,
      ['enseignant'],
      undefined,
      'en_attente',
    );
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
