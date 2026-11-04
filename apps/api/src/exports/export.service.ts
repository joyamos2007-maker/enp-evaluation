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
      const document = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });
      const morceaux: Buffer[] = [];
      document.on('data', (morceau: Buffer) => morceaux.push(morceau));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(morceaux)));

      const estCahier = headers.includes('Horaire') || headers.includes('Visa');
      const dateEdition = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const dessinerEnTete = () => {
        // En-tête institutionnel ENP & République Togolaise
        document.rect(40, 35, 515, 60).fillAndStroke('#0d3b66', '#0d3b66');

        document
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('ÉCOLE NATIONALE POLYTECHNIQUE (ENP)', 50, 43, { width: 330 });
        document
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#E2E8F0')
          .text(
            'Direction des Affaires Académiques & de la Scolarité Centrale',
            50,
            58,
            { width: 330 },
          );
        document
          .fontSize(7)
          .fillColor('#CBD5E1')
          .text(
            'Système Pédagogique Intégré • Registre Officiel Certifié',
            50,
            70,
            { width: 330 },
          );

        document
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#FDE047')
          .text('RÉPUBLIQUE TOGOLAISE', 390, 43, {
            align: 'right',
            width: 155,
          });
        document
          .fontSize(7)
          .font('Helvetica-Oblique')
          .fillColor('#E2E8F0')
          .text('Travail - Liberté - Patrie', 390, 56, {
            align: 'right',
            width: 155,
          });
        document
          .fontSize(6)
          .font('Helvetica')
          .fillColor('#CBD5E1')
          .text('Ministère de l\'Enseignement Supérieur', 390, 68, {
            align: 'right',
            width: 155,
          });

        // Bandeau titre du document
        document.y = 105;
        document
          .rect(40, 105, 515, 24)
          .fillAndStroke('#F0F5FF', '#D8DEE5');
        document
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#0D3B66')
          .text(
            estCahier
              ? 'REGISTRE DU CAHIER DE TEXTE NUMÉRIQUE OFFICIEL'
              : titre.toUpperCase(),
            40,
            111,
            { align: 'center', width: 515 },
          );

        // Méta-informations
        document.y = 136;
        document
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#475569')
          .text(
            `Année Universitaire 2026-2027 • Semestre 1 (Harmattan) • Date d'édition : ${dateEdition}`,
            40,
            135,
            { width: 515 },
          );

        document.moveDown(1.5);
      };

      dessinerEnTete();

      if (estCahier) {
        // Rendu dédié fiches de séances certifiées
        for (const [index, row] of rows.entries()) {
          // Vérification de la hauteur restante sur la page
          if (document.y > 640) {
            document.addPage();
            dessinerEnTete();
          }

          const yDebut = document.y;
          const ue = String(row[0] ?? '');
          const date = String(row[1] ?? '');
          const horaire = String(row[2] ?? '');
          const type = String(row[3] ?? '');
          const intitule = String(row[4] ?? '');
          const contenu = String(row[5] ?? '');
          const travail = String(row[6] ?? '');
          const visa = String(row[7] ?? '');

          // En-tête de la séance (fond bleu)
          document
            .rect(40, yDebut, 515, 18)
            .fillAndStroke('#0D3B66', '#0D3B66');
          document
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#FFFFFF')
            .text(`SÉANCE N° ${index + 1}   •   ${date} (${horaire})   •   TYPE : ${type}`, 48, yDebut + 5, { width: 380 });
          document
            .fontSize(7)
            .fillColor('#FDE047')
            .text(`VISA : ${visa.toUpperCase()}`, 400, yDebut + 5, { align: 'right', width: 145 });

          document.y = yDebut + 24;

          // Détails de la séance
          document
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#0D3B66')
            .text('UE : ', 48, document.y, { continued: true })
            .font('Helvetica')
            .fillColor('#1E293B')
            .text(ue);

          if (intitule) {
            document
              .font('Helvetica-Bold')
              .fillColor('#0D3B66')
              .text('Thème : ', 48, document.y, { continued: true })
              .font('Helvetica')
              .fillColor('#1E293B')
              .text(intitule);
          }

          if (contenu) {
            document
              .font('Helvetica-Bold')
              .fillColor('#0D3B66')
              .text('Contenu développé : ', 48, document.y, { continued: true })
              .font('Helvetica')
              .fillColor('#334155')
              .text(contenu, { width: 495 });
          }

          if (travail) {
            document
              .font('Helvetica-Bold')
              .fillColor('#B45309')
              .text('Travail prescrit : ', 48, document.y, { continued: true })
              .font('Helvetica')
              .fillColor('#78350F')
              .text(travail, { width: 495 });
          }

          const yFin = document.y + 4;
          // Cadre global autour de la séance
          document
            .rect(40, yDebut, 515, yFin - yDebut)
            .stroke('#CBD5E1');

          document.y = yFin + 8;
        }

        // Section finale de signature tripartite
        if (document.y > 660) {
          document.addPage();
          dessinerEnTete();
        }

        const ySign = document.y + 10;
        document
          .fontSize(7)
          .font('Helvetica-Oblique')
          .fillColor('#64748B')
          .text(
            'Le présent cahier de texte numérique est certifié conforme par le Système Pédagogique Intégré de l\'ENP.',
            40,
            ySign,
            { align: 'center', width: 515 },
          );

        const yBoites = ySign + 15;
        const largeurBoite = 160;

        // 1. Délégué
        document.rect(40, yBoites, largeurBoite, 55).stroke('#CBD5E1');
        document
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor('#0D3B66')
          .text('LE DÉLÉGUÉ DE PROMOTION', 45, yBoites + 6, { align: 'center', width: largeurBoite - 10 });
        document
          .fontSize(6)
          .font('Helvetica-Oblique')
          .fillColor('#94A3B8')
          .text('Visa & Signature', 45, yBoites + 42, { align: 'center', width: largeurBoite - 10 });

        // 2. Enseignant
        document.rect(215, yBoites, largeurBoite, 55).stroke('#CBD5E1');
        document
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor('#0D3B66')
          .text('L\'ENSEIGNANT TITULAIRE', 220, yBoites + 6, { align: 'center', width: largeurBoite - 10 });
        document
          .fontSize(6)
          .font('Helvetica-Oblique')
          .fillColor('#94A3B8')
          .text('Visa Pédagogique & Signature', 220, yBoites + 42, { align: 'center', width: largeurBoite - 10 });

        // 3. Direction des Études
        document.rect(395, yBoites, largeurBoite, 55).stroke('#CBD5E1');
        document
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor('#0D3B66')
          .text('LA DIRECTION DES ÉTUDES', 400, yBoites + 6, { align: 'center', width: largeurBoite - 10 });
        document
          .fontSize(6)
          .font('Helvetica-Oblique')
          .fillColor('#94A3B8')
          .text('Sceau Officiel ENP', 400, yBoites + 42, { align: 'center', width: largeurBoite - 10 });
      } else {
        // Rendu sous forme de bordereau structuré pour autres données
        for (const [index, row] of rows.entries()) {
          if (document.y > 700) {
            document.addPage();
            dessinerEnTete();
          }

          document
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#0D3B66')
            .text(`Ligne ${index + 1}`);
          row.forEach((value, column) => {
            document
              .fontSize(8)
              .font('Helvetica-Bold')
              .fillColor('#475569')
              .text(`${headers[column] ?? ''} : `, { continued: true })
              .font('Helvetica')
              .fillColor('#1E293B')
              .text(`${value}`);
          });
          document.moveDown(0.5);
        }
      }

      // Numérotation dynamique sur toutes les pages
      const range = document.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        document.switchToPage(i);
        document
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#64748B')
          .text(
            `Page ${i + 1} sur ${range.count}   •   Cahier de Texte Numérique Certifié   •   École Nationale Polytechnique (Lomé - Togo)`,
            40,
            800,
            { align: 'center', width: 515 },
          );
      }

      document.end();
    });
  }
}
