import { ExportService } from './export.service';
import ExcelJS from 'exceljs';

describe('ExportService', () => {
  const service = new ExportService();
  const lignes = [
    {
      ue: 'INF501 — Algorithmique',
      date: '2026-10-13',
      horaire: '08:00 — 10:00',
      type: 'CM',
      intitule: 'Graphes',
      contenu: 'Parcours en largeur',
      travail: 'Exercices',
      visa: 'vise',
    },
  ];

  it('génère un document PDF', async () => {
    const fichier = await service.generer('pdf', 'Cahier', lignes);
    expect(fichier.mime).toBe('application/pdf');
    expect(fichier.contenu.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it.each(['xlsx', 'docx'] as const)(
    'génère un document %s',
    async (format) => {
      const fichier = await service.generer(format, 'Cahier', lignes);
      expect(fichier.extension).toBe(format);
      expect(fichier.contenu.subarray(0, 2).toString()).toBe('PK');
    },
  );

  it('exporte les valeurs commençant par un opérateur comme du texte dans Excel', async () => {
    const fichier = await service.generer('xlsx', 'Cahier', [
      { ...lignes[0], intitule: '=HYPERLINK("https://example.invalid")' },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fichier.contenu);
    expect(workbook.worksheets[0].getCell('E2').value).toBe(
      `'=HYPERLINK("https://example.invalid")`,
    );
  });
});
