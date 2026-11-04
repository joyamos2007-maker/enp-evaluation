import { BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  const audit = { lister: jest.fn() };
  const campusScope = { forScolarite: jest.fn() };
  const controller = new AuditController(audit as never, campusScope as never);

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(7);
    audit.lister.mockResolvedValue([]);
  });

  it('limite les rôles et garde la Scolarité dans son campus', async () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual([
      'admin',
      'scolarite',
    ]);

    await controller.lister('25', {
      headers: {},
      utilisateur: {
        id: 8,
        roles: ['admin', 'scolarite'],
        activeRole: 'scolarite',
      },
    });

    expect(campusScope.forScolarite).toHaveBeenCalledWith(8, ['scolarite']);
    expect(audit.lister).toHaveBeenCalledWith(25, 7);
  });

  it('laisse l’administration technique consulter le journal complet', async () => {
    await controller.lister(undefined, {
      headers: {},
      utilisateur: { id: 9, roles: ['admin'], activeRole: 'admin' },
    });

    expect(campusScope.forScolarite).not.toHaveBeenCalled();
    expect(audit.lister).toHaveBeenCalledWith(100, null);
  });

  it('refuse une limite invalide', async () => {
    await expect(
      controller.lister('201', {
        headers: {},
        utilisateur: { id: 9, roles: ['admin'], activeRole: 'admin' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
