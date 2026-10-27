import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, HeadingLevel, Packer, Paragraph } from 'docx';

export type FormatExport = 'pdf' | 'xlsx' | 'docx';
export type ValeurExport = string | number;

export interface DocumentExport {
  contenu: Buffer;
  mime: string;
  extension: string;
}

const MIME_EXPORT: Record<FormatExport, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@Injectable()
export class ExportService {
  async generer(
    format: FormatExport,
    titre: string,
    seances: Array<Record<string, ValeurExport>>,
  ): Promise<DocumentExport> {
    const headers = [
      'UE',
      'Date',
      'Horaire',
      'Type',
      'Intitulé',
      'Contenu',
      'Travail à faire',
      'Visa',
    ];
    const rows = seances.map((seance) => [
      String(seance.ue ?? ''),
      String(seance.date ?? ''),
      `${seance.horaire ?? ''}`,
      String(seance.type ?? ''),
      String(seance.intitule ?? ''),
      String(seance.contenu ?? ''),
      String(seance.travail ?? ''),
      String(seance.visa ?? ''),
    ]);
    return this.genererTableau(format, titre, headers, rows, 'Séances');
  }

  async genererTableau(
    format: FormatExport,
    titre: string,
    headers: string[],
    rows: ValeurExport[][],
    onglet = 'Données',
  ): Promise<DocumentExport> {
    let contenu: Buffer;
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(onglet);
      sheet.columns = headers.map((header) => ({
        header,
        width: Math.min(48, Math.max(12, header.length + 4)),
      }));
      sheet.getRow(1).font = { bold: true };
      for (const row of rows) {
        sheet.addRow(row.map((value) => this.protegerCellule(value)));
      }
      contenu = Buffer.from(await workbook.xlsx.writeBuffer());
    } else if (format === 'docx') {
      const document = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: titre, heading: HeadingLevel.HEADING_1 }),
              ...rows.flatMap((row, index) => [
                new Paragraph({
                  text: `Ligne ${index + 1}`,
                  heading: HeadingLevel.HEADING_2,
                }),
                ...headers.map(
                  (header, column) =>
                    new Paragraph(`${header} : ${row[column] ?? ''}`),
                ),
              ]),
            ],
          },
        ],
      });
      contenu = await Packer.toBuffer(document);
    } else {
      contenu = await this.genererPdf(titre, headers, rows);
    }

    return {
      contenu,
      mime: MIME_EXPORT[format],
      extension: format,
    };
  }

  private protegerCellule(valeur: ValeurExport): ValeurExport {
    return typeof valeur === 'string' && /^[=+\-@]/.test(valeur)
      ? `'${valeur}`
      : valeur;
  }

  private genererPdf(
    titre: string,
    headers: string[],
    rows: ValeurExport[][],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ margin: 48 });
      const morceaux: Buffer[] = [];
      document.on('data', (morceau: Buffer) => morceaux.push(morceau));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(morceaux)));
      document.fontSize(18).text(titre, { underline: true });
      document.moveDown();
      for (const [index, row] of rows.entries()) {
        document.fontSize(12).text(`Ligne ${index + 1}`, { underline: true });
        row.forEach((value, column) => {
          document.fontSize(10).text(`${headers[column] ?? ''} : ${value}`);
        });
        document.moveDown();
      }
      document.end();
    });
  }
}
