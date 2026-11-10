import { NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
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

  async function classeurBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  it('valide un CSV de cours sans écrire les offres dans le référentiel', async () => {
    query
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'staging-id' }]);
    const report = await service.verifier(
      'offres',
      Buffer.from(
        'ueCode,campus,departement,programme,anneeUniversitaire,semestre\nINF101,Campus Nord,Informatique,Licence informatique,2025-2026,1\n',
      ),
      9,
      4,
    );
    expect(report).toMatchObject({
      lignesTotal: 1,
      lignesValides: 1,
      erreurs: [],
    });
    expect(query.mock.calls[3][0]).toContain(
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
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'staging-id' }]);
    const report = await service.verifier(
      'delegues',
      Buffer.from(
        'campus,departement,programme,matricule,anneeUniversitaire,type,debut,fin\nCampus Nord,Informatique,Licence informatique,DEL-1,2025-2026,titulaire,2025-09-01,2026-08-31\n',
      ),
      9,
      4,
    );
    expect(report.lignesValides).toBe(0);
    expect(report.erreurs[0].message).toContain('inscrit dans un cours');
  });

  it('lit le catalogue XLSX, conserve ses métadonnées et signale les enseignants non rapprochés', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Format 2');
    sheet.getCell('C1').value = 'Programme CPI 2026-2027';
    [
      'Code',
      'Intitulés',
      'credits',
      'Pre-requis',
      'sem evol',
      'sem etude',
      'option',
      'enseignant',
      'Contacts',
      'Emails',
    ].forEach((value, index) => {
      sheet.getRow(2).getCell(index + 1).value = value;
    });
    sheet.addRow([
      '2PHY1120',
      'Physique',
      4,
      'Mathématiques',
      1,
      1,
      'Tronc commun',
      'Enseignant inconnu',
      '+22800000000',
      'inconnu@example.com',
    ]);
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM ref.campus')) return [{ id: 4 }];
      if (sql.includes('FROM academic.annual_archives')) return [];
      if (sql.includes('FROM identity.users')) return [];
      if (sql.includes('INSERT INTO academic.import_staging')) {
        return [{ id: 'staging-id' }];
      }
      return [];
    });

    const report = await service.verifier(
      'catalogue',
      await classeurBuffer(workbook),
      9,
      4,
      'catalogue.xlsx',
      {
        campus: 'ENP-CL',
        departement: 'CPI',
        programme: 'Cycle Préparatoire Intégré',
      },
    );

    expect(report).toMatchObject({
      lignesTotal: 1,
      lignesValides: 1,
      erreurs: [],
      avertissements: [
        {
          ligne: 3,
          message: expect.stringContaining('Aucun compte enseignant'),
        },
      ],
    });
    const savedRows = JSON.parse(query.mock.calls.at(-1)?.[1][3] as string);
    expect(savedRows[0]).toMatchObject({
      code: '2PHY1120',
      prerequis: 'Mathématiques',
      annee_etude: '1',
      option: 'Tronc commun',
      email: 'inconnu@example.com',
      anneeuniversitaire: '2026-2027',
    });
  });

  it('lit les 28 dates et distingue les quatre statuts du classeur de présences', async () => {
    const workbook = new ExcelJS.Workbook();
    const settings = workbook.addWorksheet('Paramètres');
    settings.getCell('C6').value = '2026-2027';
    settings.getCell('C7').value = 'Semestre 1';
    settings.getCell('C9').value = 'Physique (2PHY1120)';
    const sheet = workbook.addWorksheet('Présence');
    sheet.getCell('A9').value = 'ETU-CPI-001';
    sheet.getCell('B9').value = 'Étudiant Exemple';
    for (let column = 4; column <= 31; column++) {
      sheet.getRow(8).getCell(column).value = new Date(
        Date.UTC(2026, 8, column - 3),
      );
    }
    sheet.getRow(9).getCell(4).value = 'P';
    sheet.getRow(9).getCell(5).value = 'R';
    sheet.getRow(9).getCell(6).value = 'A';
    sheet.getRow(9).getCell(7).value = 'J';
    sheet.getRow(10).getCell(2).value = 'Date de clôture :';
    sheet.getRow(10).getCell(4).value = 'Signature de l’enseignant(e) :';
    sheet.getRow(10).getCell(5).value = 'Visa de la Direction des Études :';
    sheet.getRow(11).getCell(1).value = 'Présents (P+R)';
    sheet.getRow(11).getCell(4).value = {
      formula: 'COUNTIF(D9:D10, "P")',
      result: 1,
    };
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT co.id')) return [{ id: 15 }];
      if (sql.includes('SELECT count(DISTINCT')) return [{ count: 1 }];
      if (sql.includes('INSERT INTO academic.import_staging')) {
        return [{ id: 'staging-id' }];
      }
      return [];
    });

    const report = await service.verifier(
      'presences',
      await classeurBuffer(workbook),
      9,
      4,
      'presences.xlsx',
      {
        campus: 'ENP-CL',
        departement: 'CPI',
        programme: 'Cycle Préparatoire Intégré',
      },
    );

    expect(report).toMatchObject({
      lignesTotal: 28,
      lignesValides: 28,
      erreurs: [],
    });
    const savedRows = JSON.parse(query.mock.calls.at(-1)?.[1][3] as string);
    expect(savedRows).toHaveLength(28);
    expect(
      savedRows
        .slice(0, 4)
        .map(
          (row: { presences: string }) => JSON.parse(row.presences)[0].statut,
        ),
    ).toEqual(['present', 'retard', 'absent', 'justifie']);
  });
});
