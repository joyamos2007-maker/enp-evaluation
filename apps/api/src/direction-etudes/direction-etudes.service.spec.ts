import { DirectionEtudesService } from './direction-etudes.service';

describe('DirectionEtudesService', () => {
  const db = { query: jest.fn() };
  const resultsDb = { lire: jest.fn() };
  const service = new DirectionEtudesService(db as never, resultsDb as never);
  const periode = { anneeUniversitaire: '2026-2027', semestre: 5 };

  beforeEach(() => jest.resetAllMocks());

  it('consolide les campus en masquant les cours sous le seuil d’anonymat', async () => {
    db.query
      .mockResolvedValueOnce([
        {
          campus_id: 1,
          campus: 'Lomé',
          campagne_id: 10,
          statut: 'restituee',
          course_id: 100,
          inscriptions: 10,
          participations: 8,
        },
        {
          campus_id: 2,
          campus: 'Kara',
          campagne_id: 20,
          statut: 'close',
          course_id: 200,
          inscriptions: 10,
          participations: 7,
        },
      ])
      .mockResolvedValueOnce([
        { id: 1, nom: 'Lomé' },
        { id: 2, nom: 'Kara' },
      ]);
    resultsDb.lire.mockResolvedValueOnce([
      { campaign_id: 10, course_id: 100, repondants: 5, total_notes: 20, somme_notes: 80 },
      { campaign_id: 20, course_id: 200, repondants: 4, total_notes: 16, somme_notes: 48 },
    ]);

    await expect(service.synthese(periode)).resolves.toMatchObject({
      periode,
      seuilAnonymat: 5,
      global: {
        campus: 2,
        campagnes: 2,
        campagnesCloses: 2,
        inscriptions: 20,
        participations: 15,
        bulletins: 9,
        tauxParticipation: 75,
        moyenneEvaluations: 4,
        coursSynthesables: 1,
      },
      campus: [
        { campus: 'Lomé', moyenneEvaluations: 4, coursSynthesables: 1 },
        { campus: 'Kara', moyenneEvaluations: null, coursSynthesables: 0 },
      ],
    });
    expect(resultsDb.lire.mock.calls[0][1]).toEqual([[10, 20]]);
  });

  it('enregistre un instantané de statistiques attribué à la Direction', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 5, publie_le: new Date('2026-10-14T00:00:00Z') }]);
    const publication = await service.publier(periode, 42);
    expect(publication.id).toBe(5);
    expect(db.query.mock.calls[2][1][0]).toBe(periode.anneeUniversitaire);
    expect(db.query.mock.calls[2][1][3]).toBe(42);
    expect(publication.statistiques.global.campagnes).toBe(0);
  });

  it('exécute les contrôles académiques à l’échelle de tous les campus', async () => {
    db.query.mockResolvedValueOnce([
      {
        code: 'CAMPAGNE_OUVERTE_ECHUE',
        campus: 'Lomé',
        departement: 'Informatique',
        campagne_id: 3,
        libelle: 'Évaluation S5',
        annee_universitaire: '2026-2027',
        semestre: 5,
      },
    ]);
    await expect(service.controlesAcademiques(periode)).resolves.toMatchObject({
      nombreAnomalies: 1,
      anomalies: [{ code: 'CAMPAGNE_OUVERTE_ECHUE', campus: 'Lomé' }],
    });
    expect(db.query.mock.calls[0][1]).toEqual(['2026-2027', 5, null]);
    expect(db.query.mock.calls[0][0]).toContain('JOIN ref.campus');
  });

  it('limite la synthèse et les contrôles au campus demandé', async () => {
    db.query
      .mockResolvedValueOnce([
        {
          campus_id: 7,
          campus: 'Campus Nord',
          campagne_id: 10,
          statut: 'close',
          course_id: 100,
          inscriptions: 8,
          participations: 6,
        },
      ])
      .mockResolvedValueOnce([{ id: 7, nom: 'Campus Nord' }])
      .mockResolvedValueOnce([]);
    resultsDb.lire.mockResolvedValueOnce([]);

    const stats = await service.synthese(periode, 7);
    await service.controlesAcademiques(periode, 7);

    expect(stats.campus).toHaveLength(1);
    expect(db.query.mock.calls[0][1]).toEqual(['2026-2027', 5, 7]);
    expect(db.query.mock.calls[1][1]).toEqual([7]);
    expect(db.query.mock.calls[2][1]).toEqual(['2026-2027', 5, 7]);
    expect(db.query.mock.calls[2][0]).toContain('c.id = $3');
  });
});
