import { NotFoundException } from '@nestjs/common';
import { AcademicImportsService } from './academic-imports.service';

describe('AcademicImportsService', () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const db = { query, transaction };
  const audit = { enregistrerDans: jest.fn() };
  const service = new AcademicImportsService(db as never, audit as never);

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (callback: (query: typeof query) => Promise<unknown>) => callback(query),
    );
  });

  it('valide un CSV de cours sans écrire les offres dans le référentiel', async () => {
    query
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'staging-id' }]);
    const report = await service.verifier(
      'offres',
      Buffer.from(
        'ueCode,programId,anneeUniversitaire,semestre\nINF101,2,2025-2026,1\n',
      ),
      9,
      4,
    );
    expect(report).toMatchObject({
      lignesTotal: 1,
      lignesValides: 1,
      erreurs: [],
    });
    expect(query.mock.calls[2][0]).toContain(
      'INSERT INTO academic.import_staging',
    );
  });

  it('conserve les erreurs de ligne et exclut la ligne invalide du staging', async () => {
    query.mockResolvedValueOnce([{ id: 'staging-id' }]);
    const report = await service.verifier(
      'ue',
      Buffer.from('code,intitule,credits\nINF101,Algorithmique,0\n'),
      9,
      null,
    );
    expect(report).toMatchObject({
      lignesTotal: 1,
      lignesValides: 0,
      erreurs: [{ ligne: 2, message: 'Code, intitulé ou crédits invalides' }],
    });
    expect(JSON.parse(query.mock.calls[0][1][3])).toEqual([]);
  });

  it('applique les lignes valides dans une transaction et conserve le résultat idempotent', async () => {
    query
      .mockResolvedValueOnce([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          campus_id: 4,
          valid_rows: [
            { code: 'INF101', intitule: 'Algorithmique', credits: '5' },
          ],
          errors: [],
          lignes_total: 1,
          statut: 'en_attente',
          resultat: null,
          expire_le: new Date(Date.now() + 60_000),
        },
      ])
      .mockResolvedValueOnce([{ cree: true }])
      .mockResolvedValueOnce([]);
    const result = await service.valider(
      'ue',
      '123e4567-e89b-12d3-a456-426614174000',
      9,
      4,
    );
    expect(result).toEqual({ crees: 1, misAJour: 0 });
    expect(query.mock.calls[1][0]).toContain('INSERT INTO ref.ue');
    expect(query.mock.calls[2][0]).toContain("SET statut = 'termine'");
  });

  it('refuse un staging appartenant à un autre utilisateur', async () => {
    query.mockResolvedValueOnce([]);
    await expect(
      service.valider('ue', '123e4567-e89b-12d3-a456-426614174000', 99, null),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('refuse les lignes de délégation lorsque le programme n’est pas inscrit', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'staging-id' }]);
    const report = await service.verifier(
      'delegues',
      Buffer.from(
        'programId,matricule,anneeUniversitaire,type,debut,fin\n2,DEL-1,2025-2026,titulaire,2025-09-01,2026-08-31\n',
      ),
      9,
      4,
    );
    expect(report.lignesValides).toBe(0);
    expect(report.erreurs[0].message).toContain('inscrit dans un cours');
  });
});
