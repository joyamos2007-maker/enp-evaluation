import { ScolariteService } from './scolarite.service';

describe('ScolariteService', () => {
  const db = { query: jest.fn() };
  const resultsDb = { lire: jest.fn() };
  const campusScope = { forScolarite: jest.fn() };
  const service = new ScolariteService(db as never, resultsDb as never, campusScope as never);

  beforeEach(() => {
    jest.resetAllMocks();
    campusScope.forScolarite.mockResolvedValue(null);
  });

  it('liste les départements avec leur campus', async () => {
    const departements = [{ id: 4, nom: 'Informatique', campus: 'Lome' }];
    db.query.mockResolvedValueOnce(departements);

    await expect(service.departements(1, ['scolarite'])).resolves.toEqual(departements);
    expect(db.query.mock.calls[0][0]).toContain('JOIN ref.campus');
  });

  it('compose les compteurs et les campagnes du tableau de bord', async () => {
    const debut = new Date('2026-10-01T00:00:00Z');
    const fin = new Date('2026-11-01T00:00:00Z');
    const campagnes = [
      {
        id: 8,
        libelle: 'Évaluation S5',
        department_id: 4,
        departement: 'Informatique',
        annee_universitaire: '2026-2027',
        semestre: 5,
        version_id: 2,
        debut,
        fin,
        statut: 'ouverte',
      },
    ];
    db.query
      .mockResolvedValueOnce(campagnes)
      .mockResolvedValueOnce([{ nombre: 3 }])
      .mockResolvedValueOnce([{ inscriptions: 20, participations: 12 }]);
    resultsDb.lire.mockResolvedValueOnce([{ bulletins: 10, commentaires: 2 }]);

    await expect(service.tableauDeBord(1, ['scolarite'])).resolves.toEqual({
      campagnesOuvertes: 1,
      comptesSansMotDePasse: 3,
      commentairesAModerer: 2,
      participation: { inscriptions: 20, participations: 12, bulletins: 10 },
      campagnes: [
        {
          id: 8,
          libelle: 'Évaluation S5',
          departmentId: 4,
          departement: 'Informatique',
          anneeUniversitaire: '2026-2027',
          semestre: 5,
          versionId: 2,
          debut,
          fin,
          statut: 'ouverte',
        },
      ],
    });
    expect(resultsDb.lire.mock.calls[0][1]).toEqual([[8], expect.any(Number)]);
  });

  it('ne lit pas l’urne quand il n’y a aucune campagne', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ nombre: 0 }])
      .mockResolvedValueOnce([{ inscriptions: 0, participations: 0 }]);

    await expect(service.tableauDeBord(1, ['scolarite'])).resolves.toMatchObject({
      campagnesOuvertes: 0,
      participation: { inscriptions: 0, participations: 0, bulletins: 0 },
    });
    expect(resultsDb.lire).not.toHaveBeenCalled();
  });
});
