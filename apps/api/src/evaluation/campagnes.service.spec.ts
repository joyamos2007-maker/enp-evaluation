import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CampagnesService } from './campagnes.service';

describe('CampagnesService', () => {
  const db = { query: jest.fn() };
  const service = new CampagnesService(db as never);

  const entree = {
    libelle: 'Evaluation test',
    departmentId: 1,
    anneeUniversitaire: '2026-2027',
    semestre: 5,
    debut: new Date('2026-10-01T00:00:00Z'),
    fin: new Date('2030-01-01T00:00:00Z'),
  };
  const ligne = (surcharge: Record<string, unknown> = {}) => ({
    id: 7,
    libelle: 'Evaluation test',
    department_id: 1,
    departement: 'Genie Informatique',
    annee_universitaire: '2026-2027',
    semestre: 5,
    version_id: 1,
    debut: new Date('2026-10-01T00:00:00Z'),
    fin: new Date(Date.now() + 86_400_000),
    statut: 'brouillon',
    ...surcharge,
  });
  const erreurPg = (code: string) => Object.assign(new Error('erreur pg'), { code });

  beforeEach(() => db.query.mockReset());

  it('cree une campagne avec la version de questionnaire active', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([ligne()]);
    const res = await service.creer(entree);
    expect(res).toMatchObject({ id: 7, departmentId: 1, versionId: 1, statut: 'brouillon' });
    expect((db.query.mock.calls[1][1] as unknown[])[4]).toBe(1);
  });

  it('refuse quand aucune version de questionnaire n est active', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.creer(entree)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse une deuxieme campagne pour le meme departement, annee et semestre', async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(erreurPg('23505'));
    await expect(service.creer(entree)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse un departement inexistant', async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(erreurPg('23503'));
    await expect(service.creer(entree)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('laisse remonter une erreur inattendue', async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]).mockRejectedValueOnce(erreurPg('57P01'));
    await expect(service.creer(entree)).rejects.toThrow('erreur pg');
  });

  it('retourne 404 pour une campagne inexistante', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.trouver(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ouvre une campagne en brouillon', async () => {
    db.query.mockResolvedValueOnce([{ id: 7 }]).mockResolvedValueOnce([ligne({ statut: 'ouverte' })]);
    await expect(service.ouvrir(7)).resolves.toMatchObject({ statut: 'ouverte' });
  });

  it('refuse d ouvrir une campagne inexistante', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.ouvrir(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse d ouvrir une campagne qui n est plus en brouillon', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([ligne({ statut: 'ouverte' })]);
    await expect(service.ouvrir(7)).rejects.toThrow('brouillon');
  });

  it('refuse d ouvrir une campagne dont la fin est passee', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ligne({ fin: new Date(Date.now() - 1000) })]);
    await expect(service.ouvrir(7)).rejects.toThrow('fin');
  });

  it('refuse d ouvrir une campagne dont le perimetre est vide', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([ligne()]);
    await expect(service.ouvrir(7)).rejects.toThrow('Perimetre vide');
  });

  it('cloture une campagne ouverte', async () => {
    db.query.mockResolvedValueOnce([{ id: 7 }]).mockResolvedValueOnce([ligne({ statut: 'close' })]);
    await expect(service.cloturer(7)).resolves.toMatchObject({ statut: 'close' });
  });

  it('refuse de cloturer une campagne qui n est pas ouverte', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([ligne()]);
    await expect(service.cloturer(7)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse de cloturer une campagne inexistante', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.cloturer(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});