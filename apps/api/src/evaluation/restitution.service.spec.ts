import { ConflictException, NotFoundException } from '@nestjs/common';
import { RestitutionService } from './restitution.service';

describe('RestitutionService', () => {
  const db = { query: jest.fn() };
  const campagnes = { trouver: jest.fn() };
  const service = new RestitutionService(db as never, campagnes as never);
  const entree = { resultats: 'Participation de 70 pour cent', suites: 'Achat de materiel' };

  beforeEach(() => jest.resetAllMocks());

  it('publie la restitution en une seule requete et retourne la campagne', async () => {
    db.query.mockResolvedValueOnce([{ id: 3 }]);
    campagnes.trouver.mockResolvedValueOnce({ id: 3, statut: 'restituee' });
    const res = await service.publier(3, 2, entree);
    expect(res).toMatchObject({ id: 3, statut: 'restituee' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([3, entree.resultats, entree.suites, 2, null]);
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain("statut = 'close'");
    expect(sql).toContain('evaluation.restitutions');
    expect(sql).toContain('audit.journal');
  });

  it('retourne 404 quand la campagne n existe pas', async () => {
    db.query.mockResolvedValueOnce([]);
    campagnes.trouver.mockRejectedValueOnce(new NotFoundException('Campagne introuvable'));
    await expect(service.publier(99, 2, entree)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse (409) une campagne qui n est pas close', async () => {
    db.query.mockResolvedValueOnce([]);
    campagnes.trouver.mockResolvedValueOnce({ id: 1, statut: 'ouverte' });
    await expect(service.publier(1, 2, entree)).rejects.toThrow('campagne close');
  });

  it('refuse (409) une campagne deja restituee', async () => {
    db.query.mockResolvedValueOnce([]);
    campagnes.trouver.mockResolvedValueOnce({ id: 1, statut: 'restituee' });
    const erreur = await service.publier(1, 2, entree).catch((e) => e);
    expect(erreur).toBeInstanceOf(ConflictException);
    expect(erreur.message).toContain('deja');
  });

  it('liste les restitutions de l etudiant en camelCase, sans donnee de participation', async () => {
    const date = new Date('2030-01-01T00:00:00Z');
    db.query.mockResolvedValueOnce([
      {
        campagne_id: 3,
        libelle: 'Evaluation test',
        departement: 'Genie Informatique',
        annee_universitaire: '2026-2027',
        semestre: 5,
        resultats: 'R',
        suites: 'S',
        publie_le: date,
      },
    ]);
    const res = await service.pourEtudiant(42);
    expect(db.query.mock.calls[0][1]).toEqual([42]);
    expect(res).toEqual([
      {
        campagneId: 3,
        libelle: 'Evaluation test',
        departement: 'Genie Informatique',
        anneeUniversitaire: '2026-2027',
        semestre: 5,
        resultats: 'R',
        suites: 'S',
        publieLe: date,
      },
    ]);
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).not.toContain('participation_ledger');
    expect(sql).not.toContain('ballot.');
  });
});