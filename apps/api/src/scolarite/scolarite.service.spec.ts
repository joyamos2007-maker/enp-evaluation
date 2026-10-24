import { BadRequestException, ConflictException } from '@nestjs/common';
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

    await expect(service.departements(1, ['admin'])).resolves.toEqual(departements);
    expect(db.query.mock.calls[0][0]).toContain('JOIN ref.campus');
  });

  it('limite la liste des examens à délibérer au campus du compte Scolarité', async () => {
    campusScope.forScolarite.mockResolvedValue(6);
    db.query.mockResolvedValueOnce([]);
    await expect(service.deliberationsExamens(12, ['scolarite'])).resolves.toEqual([]);
    expect(db.query.mock.calls[0][0]).toContain("WHERE a.type = 'examen' AND ($1::int IS NULL OR campus.id = $1)");
    expect(db.query.mock.calls[0][1]).toEqual([6]);
  });

  it('retourne les notes des étudiants d’un examen du campus autorisé', async () => {
    campusScope.forScolarite.mockResolvedValue(6);
    db.query
      .mockResolvedValueOnce([{
        id: 15,
        course_id: 20,
        code: 'INF501',
        intitule: 'Algorithmique',
        libelle: 'Examen final',
        bareme: 50,
        annee_universitaire: '2026-2027',
        semestre: 5,
        campus: 'Campus Nord',
        effectif: 1,
        notes_saisies: 1,
        deliberee_le: null,
      }])
      .mockResolvedValueOnce([{
        id: 71,
        nom: 'Test',
        prenom: 'Etudiant',
        identifiant: 'TEST-0001',
        note: 42,
      }]);

    await expect(service.detailsDeliberationExamen(12, ['scolarite'], 15)).resolves.toMatchObject({
      examen: { id: 15, notesSaisies: 1, campus: 'Campus Nord' },
      etudiants: [{ id: 71, note: 42 }],
    });
    expect(db.query.mock.calls[0][1]).toEqual([15, 6]);
    expect(db.query.mock.calls[1][1]).toEqual([15, 20]);
  });

  it('enregistre la délibération lorsque toutes les notes sont complètes', async () => {
    campusScope.forScolarite.mockResolvedValue(6);
    const delibereeLe = new Date('2026-10-14T12:00:00Z');
    db.query.mockResolvedValueOnce([{ id: 15, deliberated_at: delibereeLe }]);
    await expect(service.delibererExamen(12, ['scolarite'], 15)).resolves.toEqual({
      id: 15,
      delibereeLe,
    });
    expect(db.query.mock.calls[0][0]).toContain("a.type = 'examen'");
    expect(db.query.mock.calls[0][0]).toContain('n.note IS NOT NULL');
    expect(db.query.mock.calls[0][1]).toEqual([15, 12, 6]);
  });

  it('refuse la délibération si toutes les notes ne sont pas renseignées', async () => {
    campusScope.forScolarite.mockResolvedValue(6);
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 15,
        course_id: 20,
        code: 'INF501',
        intitule: 'Algorithmique',
        libelle: 'Examen final',
        bareme: 50,
        annee_universitaire: '2026-2027',
        semestre: 5,
        campus: 'Campus Nord',
        effectif: 2,
        notes_saisies: 1,
        deliberee_le: null,
      }])
      .mockResolvedValueOnce([]);
    await expect(service.delibererExamen(12, ['scolarite'], 15)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query.mock.calls[0][0]).toContain('INSERT INTO academic.assessment_deliberations');
    expect(db.query.mock.calls[0][1]).toEqual([15, 12, 6]);
    expect(db.query.mock.calls[2][0]).toContain('LEFT JOIN academic.assessment_scores');
  });

  it('signale un examen déjà délibéré au lieu de le publier une seconde fois', async () => {
    campusScope.forScolarite.mockResolvedValue(null);
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 15,
        course_id: 20,
        code: 'INF501',
        intitule: 'Algorithmique',
        libelle: 'Examen final',
        bareme: 50,
        annee_universitaire: '2026-2027',
        semestre: 5,
        campus: 'Campus Nord',
        effectif: 1,
        notes_saisies: 1,
        deliberee_le: new Date(),
      }])
      .mockResolvedValueOnce([]);
    await expect(service.delibererExamen(12, ['admin'], 15)).rejects.toBeInstanceOf(ConflictException);
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

    await expect(service.tableauDeBord(1, ['admin'])).resolves.toEqual({
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

    await expect(service.tableauDeBord(1, ['admin'])).resolves.toMatchObject({
      campagnesOuvertes: 0,
      participation: { inscriptions: 0, participations: 0, bulletins: 0 },
    });
    expect(resultsDb.lire).not.toHaveBeenCalled();
  });
});
