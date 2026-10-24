import { NotFoundException } from '@nestjs/common';
import { PilotageService } from './pilotage.service';

describe('PilotageService', () => {
  const db = { query: jest.fn() };
  const resultsDb = { lire: jest.fn() };
  const service = new PilotageService(db as never, resultsDb as never);

  beforeEach(() => jest.resetAllMocks());

  it('ne liste que les campagnes du département attribué', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.campagnes(12)).resolves.toEqual([]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE c.department_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual([12]);
  });

  it('compte les participations par UE sans exposer les identités', async () => {
    db.query
      .mockResolvedValueOnce([{
        id: 4,
        libelle: 'Campagne S5',
        annee_universitaire: '2026-2027',
        semestre: 5,
        statut: 'ouverte',
        debut: new Date('2026-09-01'),
        fin: new Date('2026-12-01'),
      }])
      .mockResolvedValueOnce([{
        ue_id: 30,
        code: 'INF501',
        intitule: 'Bases de données',
        enseignant: '',
        inscrits: 10,
      }]);
    resultsDb.lire.mockResolvedValueOnce([{ course_id: 30, n: 6 }]);

    await expect(service.participation(4, 12)).resolves.toEqual([
      { ueId: 30, code: 'INF501', intitule: 'Bases de données', inscrits: 10, repondants: 6 },
    ]);
    expect(resultsDb.lire.mock.calls[0][0]).not.toContain('student_id');
    expect(resultsDb.lire.mock.calls[0][1]).toEqual([4, [30]]);
  });

  it('masque les moyennes quand le nombre de réponses est inférieur au seuil', async () => {
    db.query
      .mockResolvedValueOnce([{
        id: 4,
        libelle: 'Campagne S5',
        annee_universitaire: '2026-2027',
        semestre: 5,
        statut: 'close',
        debut: new Date('2026-09-01'),
        fin: new Date('2026-12-01'),
      }])
      .mockResolvedValueOnce([{ campus: 'Lomé', departement: 'Informatique' }])
      .mockResolvedValueOnce([{
        ue_id: 30,
        code: 'INF501',
        intitule: 'Bases de données',
        enseignant: 'Ama Test',
        inscrits: 10,
      }]);
    resultsDb.lire.mockResolvedValueOnce([{
      course_id: 30,
      repondants: 4,
      moy_a: 4,
      moy_b: 4,
      moy_c: 4,
      moy_d: 4,
      satisfaction_e: 4,
    }]);

    await expect(service.synthese(4, 12)).resolves.toMatchObject({
      campus: 'Lomé',
      departement: 'Informatique',
      totalRepondants: 4,
      lignes: [{ nbReponses: 4, detailDisponible: false, satisfactionE: null }],
    });
  });

  it('refuse de lire une campagne hors du département', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.lireSuites(4, 12)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persiste les suites de campagne uniquement dans le département autorisé', async () => {
    db.query.mockResolvedValueOnce([{ campaign_id: 4 }]);
    const suites = {
      meilleuresUe: 'INF501',
      ueAttention: '',
      actions: 'Accompagnement renforcé',
      etabliPar: 'Chef de département',
      date: '2026-10-14',
      visaChef: true,
    };

    await expect(service.enregistrerSuites(4, 12, 9, suites)).resolves.toEqual(suites);
    expect(db.query.mock.calls[0][0]).toContain('WHERE c.id = $1 AND c.department_id = $2');
    expect(db.query.mock.calls[0][1]).toEqual([4, 12, 'INF501', '', 'Accompagnement renforcé', 'Chef de département', '2026-10-14', true, 9]);
  });
});
