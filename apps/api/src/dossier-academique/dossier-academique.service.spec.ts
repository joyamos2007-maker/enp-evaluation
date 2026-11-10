import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DossierAcademiqueService } from './dossier-academique.service';

describe('DossierAcademiqueService', () => {
  const db = { query: jest.fn() };
  const audit = { enregistrer: jest.fn() };
  const exports = { genererTableau: jest.fn() };
  const service = new DossierAcademiqueService(
    db as never,
    audit as never,
    exports as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('liste uniquement les UE affectées à l’enseignant connecté', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.coursEnseignant(43)).resolves.toEqual([]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE ct.teacher_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual([43]);
  });

  it('refuse de charger le cahier de notes d’une UE non affectée', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.cahierNotes(43, 900)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('crée uniquement des colonnes de devoir', async () => {
    db.query.mockResolvedValueOnce([
      { id: 12, libelle: 'Devoir 1', bareme: 20 },
    ]);
    await expect(
      service.creerEvaluation(43, 20, { libelle: 'Devoir 1', bareme: 20 }),
    ).resolves.toEqual({ id: 12, libelle: 'Devoir 1', bareme: 20 });
    expect(db.query.mock.calls[0][0]).toContain("SELECT co.id, $2, $3, 'devoir', $4");
    expect(db.query.mock.calls[0][1]).toEqual([20, 43, 'Devoir 1', 20]);
  });

  it('exporte les notes uniquement après chargement du cahier autorisé', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 20 }])
      .mockResolvedValueOnce([
        { id: 20, code: 'INF501', intitule: 'Algorithmique' },
      ])
      .mockResolvedValueOnce([
        {
          id: 71,
          nom: 'Test',
          prenom: 'Etudiant',
          identifiant: 'TEST-0001',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 12,
          libelle: 'Devoir 1',
          bareme: 20,
          created_at: '2025-01-01',
        },
      ])
      .mockResolvedValueOnce([
        { evaluation_id: 12, etudiant_id: 71, note: 16 },
      ]);
    exports.genererTableau.mockResolvedValueOnce({
      contenu: Buffer.from('xlsx'),
    });

    await service.exporterNotes(43, 20, 'xlsx');

    expect(audit.enregistrer).toHaveBeenCalledWith({
      userId: 43,
      action: 'notes_export',
      courseId: 20,
      detail: 'xlsx',
    });
    expect(exports.genererTableau).toHaveBeenCalledWith(
      'xlsx',
      'INF501 : Algorithmique',
      ['Matricule', 'Nom', 'Prénom', 'Devoir 1 (/20)'],
      [['TEST-0001', 'Test', 'Etudiant', 16]],
      'Notes',
    );
  });

  it('refuse une note qui dépasse le barème avant toute écriture', async () => {
    db.query.mockResolvedValueOnce([{ course_id: 20, bareme: 10 }]);
    await expect(
      service.enregistrerNotes(43, 12, [{ etudiantId: 71, note: 10.5 }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('refuse la saisie des notes pour une ancienne évaluation d’examen', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      service.enregistrerNotes(43, 12, [{ etudiantId: 71, note: 18 }]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain("a.type = 'devoir'");
  });

  it('ne persiste aucune note si un étudiant ne figure pas dans les inscriptions', async () => {
    db.query
      .mockResolvedValueOnce([{ course_id: 20, bareme: 20 }])
      .mockResolvedValueOnce([{ input_count: 2, saved_count: 1 }]);
    await expect(
      service.enregistrerNotes(43, 12, [
        { etudiantId: 71, note: 11 },
        { etudiantId: 99, note: 15 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query.mock.calls[1][0]).toContain(
      'WHERE (SELECT count(*) FROM admissibles) = (SELECT count(*) FROM entree)',
    );
  });

  it('n’expose que les notes de devoir à l’étudiant connecté', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.notesEtudiant(71)).resolves.toEqual([]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE e.student_id = $1');
    expect(db.query.mock.calls[0][0]).toContain("a.course_id = co.id AND a.type = 'devoir'");
    expect(db.query.mock.calls[0][0]).not.toContain('assessment_deliberations');
    expect(db.query.mock.calls[0][1]).toEqual([71]);
  });

  it('renvoie les notes de devoir sans métadonnées de délibération', async () => {
    db.query.mockResolvedValueOnce([
      {
        evaluation_id: 12,
        course_id: 20,
        code: 'INF501',
        intitule: 'Algorithmique',
        libelle: 'Devoir 1',
        bareme: 20,
        note: 16,
        created_at: '2026-03-10T12:00:00Z',
      },
    ]);
    await expect(service.notesEtudiant(71)).resolves.toEqual([
      {
        evaluationId: 12,
        coursId: 20,
        code: 'INF501',
        intitule: 'Algorithmique',
        libelle: 'Devoir 1',
        bareme: 20,
        note: 16,
        createdAt: '2026-03-10T12:00:00Z',
      },
    ]);
  });

  it('n’expose que les présences enregistrées pour l’étudiant connecté', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.presencesEtudiant(71)).resolves.toEqual({
      statistiques: {
        seancesTotal: 0,
        seancesMarquees: 0,
        presents: 0,
        absents: 0,
        retards: 0,
        justifiees: 0,
        tauxPresence: null,
      },
      presences: [],
    });
    expect(db.query.mock.calls[0][0]).toContain('WHERE p.student_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual([71]);
    expect(db.query.mock.calls[1][0]).toContain('WHERE e.student_id = $1');
    expect(db.query.mock.calls[1][1]).toEqual([71]);
  });

  it('calcule le taux de présence étudiant à partir des séances marquées', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        seances_total: 5,
        seances_marquees: 4,
        presents: 2,
        absents: 1,
        retards: 0,
        justifiees: 1,
      },
    ]);
    await expect(service.presencesEtudiant(71)).resolves.toMatchObject({
      statistiques: {
        seancesTotal: 5,
        seancesMarquees: 4,
        presents: 2,
        absents: 1,
        retards: 0,
        justifiees: 1,
        tauxPresence: 50,
      },
    });
    expect(db.query.mock.calls[1][0]).toContain("p.statut = 'justifie'");
  });

  it('calcule les statistiques de présence dans le roster enseignant', async () => {
    db.query
      .mockResolvedValueOnce([
        { id: 8, course_id: 20, date: '2025-01-10', libelle: 'Cours' },
      ])
      .mockResolvedValueOnce([
        {
          id: 71,
          nom: 'Test',
          prenom: 'Etudiant',
          identifiant: 'TEST-0001',
          statut: 'present',
          seances_total: 4,
          seances_marquees: 2,
          presents: 1,
          absents: 1,
          retards: 0,
          justifiees: 0,
        },
      ]);
    await expect(service.rosterPresence(43, 8)).resolves.toMatchObject({
      etudiants: [
        {
          id: 71,
          statistiques: {
            seancesTotal: 4,
            seancesMarquees: 2,
            presents: 1,
            absents: 1,
            retards: 0,
            justifiees: 0,
            tauxPresence: 50,
          },
        },
      ],
    });
  });

  it('rejette tout statut de présence qui ne fait pas partie des valeurs permises', async () => {
    db.query
      .mockResolvedValueOnce([{ course_id: 20 }])
      .mockResolvedValueOnce([{ input_count: 1, saved_count: 0 }]);
    await expect(
      service.enregistrerPresences(43, 8, [
        { etudiantId: 71, statut: 'excuse' as never },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
