import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdministrationService } from './administration.service';

describe('AdministrationService', () => {
  const db = { query: jest.fn() };
  const service = new AdministrationService(db as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retourne les référentiels alignés sur les tables du schéma', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 1, nom: 'Lomé' }])
      .mockResolvedValueOnce([{ id: 2, nom: 'Informatique', campusId: 1, campus: 'Lomé' }])
      .mockResolvedValueOnce([{ id: 3, nom: 'Cycle Ingénieur', departmentId: 2, departement: 'Informatique' }]);

    await expect(service.referentiels()).resolves.toEqual({
      campus: [{ id: 1, nom: 'Lomé' }],
      departements: [{ id: 2, nom: 'Informatique', campusId: 1, campus: 'Lomé' }],
      programmes: [{ id: 3, nom: 'Cycle Ingénieur', departmentId: 2, departement: 'Informatique' }],
    });
    expect(db.query.mock.calls.map(([sql]) => sql)).toEqual([
      expect.stringContaining('FROM ref.campus'),
      expect.stringContaining('FROM ref.department'),
      expect.stringContaining('FROM ref.program'),
    ]);
  });

  it('ne renvoie que les campus à la Direction des Études', async () => {
    db.query.mockResolvedValueOnce([{ id: 1, nom: 'Lomé' }]);
    await expect(service.referentiels(true)).resolves.toEqual({
      campus: [{ id: 1, nom: 'Lomé' }],
      departements: [],
      programmes: [],
    });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('traduit un campus dupliqué en conflit explicite', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(service.creerCampus('Lomé')).rejects.toBeInstanceOf(ConflictException);
  });

  it('signale une référence parente absente', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error('foreign key'), { code: '23503' }));
    await expect(service.creerDepartement(999, 'Informatique')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('affecte un compte au service Scolarité de son campus', async () => {
    const affectation = { userId: 7, campusId: 2, campus: 'Kara' };
    db.query.mockResolvedValueOnce([affectation]);
    await expect(service.affecterScolarite(7, 2)).resolves.toEqual(affectation);
    expect(db.query.mock.calls[0][1]).toEqual([7, 2]);
    expect(db.query.mock.calls[0][0]).toContain("VALUES ($1, 'scolarite', $2)");
  });

  it('refuse de déplacer implicitement un service Scolarité vers un autre campus', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.affecterScolarite(7, 2)).rejects.toBeInstanceOf(ConflictException);
  });

  it('signale un compte ou un campus absent lors de l’affectation', async () => {
    db.query.mockRejectedValueOnce(Object.assign(new Error('foreign key'), { code: '23503' }));
    await expect(service.affecterScolarite(999, 2)).rejects.toBeInstanceOf(NotFoundException);
  });
});
