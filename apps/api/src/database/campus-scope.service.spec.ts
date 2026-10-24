import { ForbiddenException } from '@nestjs/common';
import { CampusScopeService } from './campus-scope.service';

describe('CampusScopeService', () => {
  const db = { query: jest.fn() };
  const service = new CampusScopeService(db as never);

  beforeEach(() => jest.resetAllMocks());

  it('donne un périmètre global à l’administration', async () => {
    await expect(service.forScolarite(1, ['admin', 'scolarite'])).resolves.toBeNull();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('retourne le campus rattaché au rôle Scolarité', async () => {
    db.query.mockResolvedValueOnce([{ campus_id: 4 }]);
    await expect(service.forScolarite(7, ['scolarite'])).resolves.toBe(4);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });

  it('refuse un rôle Scolarité sans campus affecté', async () => {
    db.query.mockResolvedValueOnce([{ campus_id: null }]);
    await expect(service.forScolarite(7, ['scolarite'])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse l’accès à un département hors campus', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.verifierDepartement(9, 4)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retourne le département affecté au Chef de département', async () => {
    db.query.mockResolvedValueOnce([{ department_id: 12 }]);
    await expect(service.forChefDepartement(7, ['chef_departement'])).resolves.toBe(12);
    expect(db.query.mock.calls[0][1]).toEqual([7]);
  });

  it('refuse un Chef de département sans rattachement', async () => {
    db.query.mockResolvedValueOnce([{ department_id: null }]);
    await expect(service.forChefDepartement(7, ['chef_departement'])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
