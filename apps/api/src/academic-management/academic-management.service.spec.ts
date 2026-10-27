import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicManagementService } from './academic-management.service';
import { AnnualArchivesService } from './annual-archives.service';

describe('AcademicManagementService', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const audit = { enregistrerDans: jest.fn() };
  const service = new AcademicManagementService(
    { query, transaction } as never,
    audit as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (callback: (query: typeof query) => Promise<unknown>) => callback(query),
    );
  });

  it('crée un mandat de délégué et synchronise le référentiel de délégation', async () => {
    query
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'mandate-id', student_id: 12 }])
      .mockResolvedValueOnce([]);
    await expect(
      service.enregistrerDelegue(
        2,
        12,
        '2025-2026',
        'titulaire',
        '2025-09-01',
        '2026-08-31',
        4,
        9,
      ),
    ).resolves.toEqual({ id: 'mandate-id', userId: 12 });
    expect(query.mock.calls[4][0]).toContain(
      'INSERT INTO ref.class_delegate_mandates',
    );
    expect(query.mock.calls[5][0]).toContain('INSERT INTO ref.class_delegate');
  });

  it('refuse une affectation de délégué dans une année archivée', async () => {
    query.mockResolvedValueOnce([{ id: 2 }]).mockResolvedValueOnce([{ id: 1 }]);
    await expect(
      service.enregistrerDelegue(
        2,
        12,
        '2025-2026',
        'titulaire',
        '2025-09-01',
        '2026-08-31',
        4,
        9,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('ne révèle pas les enseignants d’un cours hors du périmètre campus', async () => {
    query.mockResolvedValueOnce([]);
    await expect(service.listerEnseignants(8, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AnnualArchivesService', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const audit = { enregistrerDans: jest.fn() };
  const service = new AnnualArchivesService(
    { query, transaction } as never,
    audit as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (callback: (query: typeof query) => Promise<unknown>) => callback(query),
    );
  });

  it('archive les données académiques sans inclure les bulletins anonymes', async () => {
    query
      .mockResolvedValueOnce([{ snapshot: { cours: [], notes: [] } }])
      .mockResolvedValueOnce([{ id: 1, archive_le: new Date() }]);
    await expect(service.creer('2025-2026', 9)).resolves.toMatchObject({
      anneeUniversitaire: '2025-2026',
    });
    const snapshotSql = query.mock.calls[0][0] as string;
    expect(snapshotSql).toContain('assessment_scores');
    expect(snapshotSql).toContain('attendance_records');
    expect(snapshotSql).not.toContain('ballot.ballots');
    expect(query.mock.calls[1][0]).toContain(
      'ON CONFLICT (annee_universitaire) DO NOTHING',
    );
  });
});
