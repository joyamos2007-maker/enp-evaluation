import { ConflictException, NotFoundException } from '@nestjs/common';
import { CahierTexteService } from './cahier-texte.service';

describe('CahierTexteService', () => {
  const db = { query: jest.fn(), transaction: jest.fn() };
  const audit = { enregistrer: jest.fn(), enregistrerDans: jest.fn() };
  const exports = { generer: jest.fn() };
  const service = new CahierTexteService(
    db as never,
    audit as never,
    exports as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    db.transaction.mockImplementation(
      (work: (query: typeof db.query) => Promise<unknown>) => work(db.query),
    );
  });

  it('limite les UE aux classes déléguées ou cours des enseignants connectés', async () => {
    db.query.mockResolvedValueOnce([
      {
        ue_id: 5,
        code: 'INF501',
        intitule: 'Bases de données',
        enseignants: ['A. Enseignant'],
      },
    ]);
    await expect(service.mesUes(12, ['delegue'])).resolves.toEqual([
      {
        ueId: 5,
        code: 'INF501',
        intitule: 'Bases de données',
        enseignants: ['A. Enseignant'],
      },
    ]);
    expect(db.query.mock.calls[0][1]).toEqual([12, true, false, false, null, null]);
    expect(db.query.mock.calls[0][0]).toContain('ref.class_delegate');
  });

  it('limite les séances du Service Scolarité au campus et celles du Chef au département', async () => {
    db.query.mockResolvedValueOnce([]);
    await service.mesUes(20, ['scolarite'], 9, null);
    expect(db.query.mock.calls[0][0]).toContain('d.campus_id = $5');
    expect(db.query.mock.calls[0][1]).toEqual([
      20,
      false,
      false,
      false,
      9,
      null,
    ]);

    db.query.mockResolvedValueOnce([]);
    await service.seances(21, ['chef_departement'], undefined, undefined, null, 14);
    expect(db.query.mock.calls[1][0]).toContain('p.department_id = $8');
    expect(db.query.mock.calls[1][1]).toEqual([
      21,
      null,
      null,
      false,
      false,
      false,
      null,
      14,
    ]);
  });

  it('ne retourne que les séances dans le périmètre du rôle connecté', async () => {
    db.query.mockResolvedValueOnce([
      {
        id: 8,
        ue_id: 5,
        ue_code: 'INF501',
        ue_intitule: 'Bases de données',
        date: '2026-10-13',
        debut: '08:00',
        fin: '10:00',
        type: 'CM',
        groupe: null,
        statut: 'tenue',
        intitule: 'SQL',
        contenu: 'Requêtes',
        travail_a_faire: null,
        effectif: 25,
        observations: null,
        visa_statut: 'en_attente',
        visa_commentaire: null,
        visa_date: null,
        peut_modifier: true,
      },
    ]);
    const result = await service.seances(12, ['delegue'], 5, 'en_attente');
    expect(db.query.mock.calls[0][1]).toEqual([
      12,
      5,
      'en_attente',
      true,
      false,
      false,
      null,
      null,
    ]);
    expect(result[0]).toMatchObject({
      id: 8,
      ueId: 5,
      ueCode: 'INF501',
      visa: { statut: 'en_attente' },
      modifiable: true,
    });
  });

  it('crée une séance dans une UE de la classe déléguée puis la renvoie', async () => {
    db.query.mockResolvedValueOnce([{ id: 8 }]).mockResolvedValueOnce([
      {
        id: 8,
        ue_id: 5,
        ue_code: 'INF501',
        ue_intitule: 'Bases de données',
        date: '2026-10-13',
        debut: '08:00',
        fin: '10:00',
        type: 'CM',
        groupe: null,
        statut: 'tenue',
        intitule: 'SQL',
        contenu: 'Requêtes',
        travail_a_faire: null,
        effectif: null,
        observations: null,
        visa_statut: 'en_attente',
        visa_commentaire: null,
        visa_date: null,
        peut_modifier: true,
      },
    ]);
    const result = await service.creer(12, {
      ueId: 5,
      date: '2026-10-13',
      debut: '08:00',
      fin: '10:00',
      type: 'CM',
      statut: 'tenue',
      intitule: 'SQL',
      contenu: 'Requêtes',
    });
    expect(result.id).toBe(8);
    expect(db.query.mock.calls[0][0]).toContain('ref.class_delegate');
    expect(db.query.mock.calls[0][1]).toEqual([
      5,
      12,
      '2026-10-13',
      '08:00',
      '10:00',
      'CM',
      null,
      'tenue',
      'SQL',
      'Requêtes',
      null,
      null,
      null,
    ]);
  });

  it('refuse une création hors du périmètre du délégué', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      service.creer(12, {
        ueId: 99,
        date: '2026-10-13',
        debut: '08:00',
        fin: '10:00',
        type: 'CM',
        statut: 'tenue',
        intitule: 'SQL',
        contenu: 'Requêtes',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse la modification d’une séance déjà visée côté API', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      service.modifier(12, 8, {
        ueId: 5,
        date: '2026-10-13',
        debut: '08:00',
        fin: '10:00',
        type: 'CM',
        statut: 'tenue',
        intitule: 'SQL',
        contenu: 'Requêtes',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.query.mock.calls[0][0]).toContain("s.visa_statut <> 'vise'");
  });

  it('réserve les séances étudiantes aux cours inscrits et aux séances visées ou planifiées', async () => {
    db.query.mockResolvedValueOnce([]);
    await service.seances(12, ['etudiant']);
    expect(db.query.mock.calls[0][0]).toContain(
      "s.visa_statut = 'vise' OR s.statut = 'planifiee'",
    );
    expect(db.query.mock.calls[0][0]).toContain('ref.enrollment');
    expect(db.query.mock.calls[0][1]).toEqual([
      12,
      null,
      null,
      false,
      false,
      true,
      null,
      null,
    ]);
  });

  it('limite le visa aux enseignants affectés à l’UE', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.viser(12, 8, 'vise')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.query.mock.calls[0][0]).toContain('ref.course_teacher');
  });

  it('calcule les heures depuis les séances tenues et renvoie le prévu du cours', async () => {
    db.query.mockResolvedValueOnce([
      {
        ue_id: 5,
        heures_cm_prevues: '30',
        heures_td_prevues: '12',
        heures_tp_prevues: '6',
        heures_cm_effectuees: '2',
        heures_td_effectuees: '1.5',
        heures_tp_effectuees: '0',
      },
    ]);
    await expect(service.avancement(12, ['enseignant'], 5)).resolves.toEqual({
      ueId: 5,
      heuresPrevues: { cm: 30, td: 12, tp: 6 },
      heuresEffectuees: { cm: 2, td: 1.5, tp: 0 },
    });
    expect(db.query.mock.calls[0][1]).toEqual([
      5, 12, false, true, null, null, false,
    ]);
  });

  it('limite les statistiques horaires au périmètre Scolarité', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      service.avancement(12, ['scolarite'], 5, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query.mock.calls[0][0]).toContain('d.campus_id = $5');
    expect(db.query.mock.calls[0][1]).toEqual([
      5, 12, false, false, 8, null, false,
    ]);
  });

  it('limite les statistiques horaires au département du chef', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(
      service.avancement(12, ['chef_departement'], 5, null, 14),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query.mock.calls[0][0]).toContain('p.department_id = $6');
    expect(db.query.mock.calls[0][1]).toEqual([
      5, 12, false, false, null, 14, false,
    ]);
  });
});
