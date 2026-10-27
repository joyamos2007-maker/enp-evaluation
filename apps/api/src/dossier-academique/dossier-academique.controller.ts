import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from '../evaluation/campagnes.validation';
import {
  DossierAcademiqueService,
  type EntreeEvaluation,
  type EntreeNote,
  type EntreePresence,
  type StatutPresence,
  type TypeEvaluation,
} from './dossier-academique.service';
import type { FormatExport } from '../exports/export.service';

const TYPES_EVALUATION: TypeEvaluation[] = ['devoir', 'examen'];
const STATUTS_PRESENCE: StatutPresence[] = ['present', 'absent', 'retard'];
const FORMATS_EXPORT: FormatExport[] = ['pdf', 'xlsx', 'docx'];

function utilisateur(requete: RequeteAuthentifiee) {
  if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
  return requete.utilisateur;
}

function idValide(brut: string, nom = 'id') {
  const id = lireId(brut);
  if (id === null)
    throw new BadRequestException(`${nom} doit être un entier positif`);
  return id;
}

function objet(corps: unknown): Record<string, unknown> {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) {
    throw new BadRequestException('Le corps de la requête est invalide');
  }
  return corps as Record<string, unknown>;
}

function libelleValide(valeur: unknown, nom: string) {
  if (
    typeof valeur !== 'string' ||
    valeur.trim().length < 1 ||
    valeur.trim().length > 120
  ) {
    throw new BadRequestException(
      `${nom} doit contenir entre 1 et 120 caractères`,
    );
  }
  return valeur.trim();
}

function aDeuxDecimales(valeur: number) {
  return Number(valeur.toFixed(2)) === valeur;
}

function validerEvaluation(corps: unknown): EntreeEvaluation {
  const entree = objet(corps);
  if (
    typeof entree.type !== 'string' ||
    !TYPES_EVALUATION.includes(entree.type as TypeEvaluation)
  ) {
    throw new BadRequestException('type doit être devoir ou examen');
  }
  if (
    typeof entree.bareme !== 'number' ||
    !Number.isFinite(entree.bareme) ||
    entree.bareme <= 0 ||
    entree.bareme > 100000 ||
    !aDeuxDecimales(entree.bareme)
  ) {
    throw new BadRequestException(
      'Le barème doit être un nombre positif avec au plus deux décimales',
    );
  }
  return {
    libelle: libelleValide(entree.libelle, 'libelle'),
    type: entree.type as TypeEvaluation,
    bareme: entree.bareme,
  };
}

function lireEtudiants(corps: unknown): Record<string, unknown>[] {
  const entree = objet(corps);
  if (
    !Array.isArray(entree.etudiants) ||
    entree.etudiants.length < 1 ||
    entree.etudiants.length > 2000
  ) {
    throw new BadRequestException(
      'etudiants doit contenir entre 1 et 2000 entrées',
    );
  }
  const identifiants = new Set<number>();
  return entree.etudiants.map((ligne) => {
    const item = objet(ligne);
    if (
      typeof item.etudiantId !== 'number' ||
      !Number.isSafeInteger(item.etudiantId) ||
      item.etudiantId < 1 ||
      identifiants.has(item.etudiantId)
    ) {
      throw new BadRequestException(
        'Chaque étudiant doit avoir un identifiant valide et unique',
      );
    }
    identifiants.add(item.etudiantId);
    return item;
  });
}

function validerNotes(corps: unknown): EntreeNote[] {
  return lireEtudiants(corps).map((item) => {
    if (
      item.note !== null &&
      (typeof item.note !== 'number' ||
        !Number.isFinite(item.note) ||
        item.note < 0 ||
        !aDeuxDecimales(item.note))
    ) {
      throw new BadRequestException(
        'Chaque note doit être positive ou nulle, avec au plus deux décimales',
      );
    }
    return {
      etudiantId: item.etudiantId as number,
      note: item.note as number | null,
    };
  });
}

function validerPresences(corps: unknown): EntreePresence[] {
  return lireEtudiants(corps).map((item) => {
    if (
      typeof item.statut !== 'string' ||
      !STATUTS_PRESENCE.includes(item.statut as StatutPresence)
    ) {
      throw new BadRequestException(
        'statut doit être present, absent ou retard',
      );
    }
    return {
      etudiantId: item.etudiantId as number,
      statut: item.statut as StatutPresence,
    };
  });
}

function validerDate(valeur: unknown) {
  if (
    typeof valeur !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valeur) ||
    Number.isNaN(Date.parse(`${valeur}T00:00:00Z`)) ||
    new Date(`${valeur}T00:00:00Z`).toISOString().slice(0, 10) !== valeur ||
    valeur > new Date().toISOString().slice(0, 10)
  ) {
    throw new BadRequestException(
      'date doit être une date valide qui n’est pas dans le futur',
    );
  }
  return valeur;
}

@Controller('dossier-academique')
export class DossierAcademiqueController {
  constructor(private readonly dossier: DossierAcademiqueService) {}

  @Get('enseignant/ues')
  @Acces('enseignant')
  coursEnseignant(@Req() requete: RequeteAuthentifiee) {
    return this.dossier.coursEnseignant(utilisateur(requete).id);
  }

  @Get('enseignant/ues/:courseId/notes')
  @Acces('enseignant')
  cahierNotes(
    @Req() requete: RequeteAuthentifiee,
    @Param('courseId') courseIdBrut: string,
  ) {
    return this.dossier.cahierNotes(
      utilisateur(requete).id,
      idValide(courseIdBrut, 'courseId'),
    );
  }

  @Get('enseignant/ues/:courseId/notes/export')
  @Acces('enseignant')
  async exporterNotes(
    @Req() requete: RequeteAuthentifiee,
    @Param('courseId') courseIdBrut: string,
    @Query('format') formatBrut: string,
  ) {
    if (!FORMATS_EXPORT.includes(formatBrut as FormatExport)) {
      throw new BadRequestException('format doit être pdf, xlsx ou docx');
    }
    const fichier = await this.dossier.exporterNotes(
      utilisateur(requete).id,
      idValide(courseIdBrut, 'courseId'),
      formatBrut as FormatExport,
    );
    return new StreamableFile(fichier.contenu, {
      type: fichier.mime,
      disposition: `attachment; filename="notes-cours.${fichier.extension}"`,
    });
  }

  @Post('enseignant/ues/:courseId/evaluations')
  @Acces('enseignant')
  creerEvaluation(
    @Req() requete: RequeteAuthentifiee,
    @Param('courseId') courseIdBrut: string,
    @Body() corps: unknown,
  ) {
    return this.dossier.creerEvaluation(
      utilisateur(requete).id,
      idValide(courseIdBrut, 'courseId'),
      validerEvaluation(corps),
    );
  }

  @Patch('enseignant/evaluations/:evaluationId/notes')
  @Acces('enseignant')
  enregistrerNotes(
    @Req() requete: RequeteAuthentifiee,
    @Param('evaluationId') evaluationIdBrut: string,
    @Body() corps: unknown,
  ) {
    return this.dossier.enregistrerNotes(
      utilisateur(requete).id,
      idValide(evaluationIdBrut, 'evaluationId'),
      validerNotes(corps),
    );
  }

  @Get('enseignant/ues/:courseId/presences')
  @Acces('enseignant')
  seancesPresence(
    @Req() requete: RequeteAuthentifiee,
    @Param('courseId') courseIdBrut: string,
  ) {
    return this.dossier.seancesPresence(
      utilisateur(requete).id,
      idValide(courseIdBrut, 'courseId'),
    );
  }

  @Post('enseignant/ues/:courseId/presences')
  @Acces('enseignant')
  creerSeancePresence(
    @Req() requete: RequeteAuthentifiee,
    @Param('courseId') courseIdBrut: string,
    @Body() corps: unknown,
  ) {
    const entree = objet(corps);
    return this.dossier.creerSeancePresence(
      utilisateur(requete).id,
      idValide(courseIdBrut, 'courseId'),
      validerDate(entree.date),
      libelleValide(entree.libelle, 'libelle'),
    );
  }

  @Get('enseignant/presences/:sessionId')
  @Acces('enseignant')
  rosterPresence(
    @Req() requete: RequeteAuthentifiee,
    @Param('sessionId') sessionIdBrut: string,
  ) {
    return this.dossier.rosterPresence(
      utilisateur(requete).id,
      idValide(sessionIdBrut, 'sessionId'),
    );
  }

  @Patch('enseignant/presences/:sessionId')
  @Acces('enseignant')
  enregistrerPresences(
    @Req() requete: RequeteAuthentifiee,
    @Param('sessionId') sessionIdBrut: string,
    @Body() corps: unknown,
  ) {
    return this.dossier.enregistrerPresences(
      utilisateur(requete).id,
      idValide(sessionIdBrut, 'sessionId'),
      validerPresences(corps),
    );
  }

  @Get('etudiant/mes-notes')
  @Acces('etudiant', 'delegue')
  notesEtudiant(@Req() requete: RequeteAuthentifiee) {
    return this.dossier.notesEtudiant(utilisateur(requete).id);
  }

  @Get('etudiant/mes-presences')
  @Acces('etudiant', 'delegue')
  presencesEtudiant(@Req() requete: RequeteAuthentifiee) {
    return this.dossier.presencesEtudiant(utilisateur(requete).id);
  }
}
