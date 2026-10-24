import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  Patch,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Query as QueryParam,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from '../evaluation/campagnes.validation';
import {
  CahierTexteService,
  type EntreeSeance,
  type StatutSeance,
  type StatutVisa,
  type TypeSeance,
} from './cahier-texte.service';
import type { FormatExport } from '../exports/export.service';

const FORMATS_EXPORT: FormatExport[] = ['pdf', 'xlsx', 'docx'];

const TYPES: TypeSeance[] = ['CM', 'TD', 'TP', 'AUTRE'];
const STATUTS: StatutSeance[] = [
  'tenue',
  'reportee',
  'annulee',
  'enseignant_absent',
  'planifiee',
];
const VISAS: StatutVisa[] = ['en_attente', 'vise', 'conteste'];

function validerEntree(corps: unknown): EntreeSeance {
  if (typeof corps !== 'object' || corps === null) {
    throw new BadRequestException('Les données de la séance sont invalides');
  }
  const entree = corps as Record<string, unknown>;
  const optionnel = (nom: string, max: number): string | undefined => {
    const valeur = entree[nom];
    if (valeur === undefined || valeur === null || valeur === '')
      return undefined;
    if (typeof valeur !== 'string' || valeur.trim().length > max) {
      throw new BadRequestException(
        `${nom} invalide (maximum ${max} caractères)`,
      );
    }
    return valeur.trim();
  };
  const ueId =
    typeof entree.ueId === 'number' && Number.isInteger(entree.ueId)
      ? lireId(String(entree.ueId))
      : null;
  const date = entree.date;
  const debut = entree.debut;
  const fin = entree.fin;
  const type = entree.type;
  const statut = entree.statut;
  if (
    ueId === null ||
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    typeof debut !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(debut) ||
    typeof fin !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(fin) ||
    fin <= debut ||
    typeof type !== 'string' ||
    !TYPES.includes(type as TypeSeance) ||
    typeof statut !== 'string' ||
    !STATUTS.includes(statut as StatutSeance)
  ) {
    throw new BadRequestException(
      'UE, date, horaires, type ou statut de séance invalide',
    );
  }
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('La date de séance est invalide');
  }
  if (date > new Date().toISOString().slice(0, 10) && statut !== 'planifiee') {
    throw new BadRequestException(
      'La date de séance ne peut pas être dans le futur',
    );
  }
  if (statut === 'planifiee' && date <= new Date().toISOString().slice(0, 10)) {
    throw new BadRequestException(
      'Une séance planifiée doit avoir une date future',
    );
  }
  const effectif = entree.effectif;
  if (
    effectif !== undefined &&
    effectif !== null &&
    (typeof effectif !== 'number' ||
      !Number.isSafeInteger(effectif) ||
      effectif < 0)
  ) {
    throw new BadRequestException(
      'effectif doit être un entier positif ou nul',
    );
  }
  const intitule = optionnel('intitule', 200);
  const contenu = optionnel('contenu', 5000);
  if (statut === 'tenue' && (!intitule || !contenu)) {
    throw new BadRequestException(
      'L’intitulé et le contenu sont obligatoires pour une séance tenue',
    );
  }
  return {
    ueId,
    date,
    debut,
    fin,
    type: type as TypeSeance,
    groupe: optionnel('groupe', 100),
    statut: statut as StatutSeance,
    intitule,
    contenu,
    travailAFaire: optionnel('travailAFaire', 5000),
    effectif:
      effectif === undefined || effectif === null ? undefined : effectif,
    observations: optionnel('observations', 3000),
  };
}

function utilisateur(requete: RequeteAuthentifiee) {
  if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
  return requete.utilisateur;
}

@Controller('cahier-texte')
export class CahierTexteController {
  constructor(private readonly cahier: CahierTexteService) {}

  @Get('mes-ues')
  @Acces('delegue', 'enseignant', 'etudiant')
  mesUes(@Req() requete: RequeteAuthentifiee) {
    const user = utilisateur(requete);
    return this.cahier.mesUes(user.id, user.roles);
  }

  @Get('seances')
  @Acces('delegue', 'enseignant', 'etudiant')
  seances(
    @Req() requete: RequeteAuthentifiee,
    @Query('ueId') ueIdBrut?: string,
    @Query('statutVisa') visaBrut?: string,
  ) {
    const ueId = ueIdBrut === undefined ? undefined : lireId(ueIdBrut);
    if (ueIdBrut !== undefined && ueId === null) {
      throw new BadRequestException('ueId doit être un entier positif');
    }
    if (visaBrut !== undefined && !VISAS.includes(visaBrut as StatutVisa)) {
      throw new BadRequestException('statutVisa invalide');
    }
    const user = utilisateur(requete);
    return this.cahier.seances(
      user.id,
      user.roles,
      ueId ?? undefined,
      visaBrut as StatutVisa,
    );
  }

  @Post('seances')
  @Acces('delegue')
  creer(@Req() requete: RequeteAuthentifiee, @Body() corps: unknown) {
    return this.cahier.creer(utilisateur(requete).id, validerEntree(corps));
  }

  @Patch('seances/:id')
  @Acces('delegue')
  modifier(
    @Req() requete: RequeteAuthentifiee,
    @Param('id') idBrut: string,
    @Body() corps: unknown,
  ) {
    const id = lireId(idBrut);
    if (id === null)
      throw new BadRequestException('id doit être un entier positif');
    return this.cahier.modifier(
      utilisateur(requete).id,
      id,
      validerEntree(corps),
    );
  }

  @Post('seances/:id/visa')
  @Acces('enseignant')
  viser(
    @Req() requete: RequeteAuthentifiee,
    @Param('id') idBrut: string,
    @Body() corps: unknown,
  ) {
    const id = lireId(idBrut);
    if (id === null || typeof corps !== 'object' || corps === null) {
      throw new BadRequestException('Identifiant ou décision de visa invalide');
    }
    const body = corps as Record<string, unknown>;
    const decision = body.decision;
    if (decision !== 'vise' && decision !== 'conteste') {
      throw new BadRequestException('decision doit être vise ou conteste');
    }
    const commentaire = body.commentaire;
    if (
      commentaire !== undefined &&
      (typeof commentaire !== 'string' || commentaire.trim().length > 2000)
    ) {
      throw new BadRequestException(
        'commentaire invalide (2000 caractères maximum)',
      );
    }
    if (
      decision === 'conteste' &&
      (typeof commentaire !== 'string' || !commentaire.trim())
    ) {
      throw new BadRequestException(
        'Un commentaire est obligatoire pour contester',
      );
    }
    return this.cahier.viser(
      utilisateur(requete).id,
      id,
      decision,
      typeof commentaire === 'string' ? commentaire.trim() : undefined,
    );
  }

  @Get('ues/:ueId/avancement')
  @Acces('delegue', 'enseignant')
  avancement(
    @Req() requete: RequeteAuthentifiee,
    @Param('ueId') ueIdBrut: string,
  ) {
    const ueId = lireId(ueIdBrut);
    if (ueId === null)
      throw new BadRequestException('ueId doit être un entier positif');
    const user = utilisateur(requete);
    return this.cahier.avancement(user.id, user.roles, ueId);
  }

  @Get('export')
  @Acces('delegue', 'enseignant', 'etudiant')
  async exporter(
    @Req() requete: RequeteAuthentifiee,
    @QueryParam('format') formatBrut: string,
    @QueryParam('ueId') ueIdBrut?: string,
  ) {
    const user = utilisateur(requete);
    if (!FORMATS_EXPORT.includes(formatBrut as FormatExport)) {
      throw new BadRequestException('format doit être pdf, xlsx ou docx');
    }
    const ueId = ueIdBrut === undefined ? undefined : lireId(ueIdBrut);
    if (ueIdBrut !== undefined && ueId === null) {
      throw new BadRequestException('ueId doit être un entier positif');
    }
    const fichier = await this.cahier.exporter(
      user.id,
      user.roles,
      formatBrut as FormatExport,
      ueId ?? undefined,
    );
    const nom = `cahier-texte.${fichier.extension}`;
    return new StreamableFile(fichier.contenu, {
      type: fichier.mime,
      disposition: `attachment; filename="${nom}"`,
    });
  }

  @Get('seances/:id/historique')
  @Acces('delegue', 'enseignant', 'etudiant')
  historique(@Req() requete: RequeteAuthentifiee, @Param('id') idBrut: string) {
    const id = lireId(idBrut);
    if (id === null)
      throw new BadRequestException('id doit être un entier positif');
    const user = utilisateur(requete);
    return this.cahier.historique(user.id, user.roles, id);
  }

  @Get('seances/:id/pieces')
  @Acces('delegue', 'enseignant', 'etudiant')
  pieces(@Req() requete: RequeteAuthentifiee, @Param('id') idBrut: string) {
    const id = lireId(idBrut);
    if (id === null)
      throw new BadRequestException('id doit être un entier positif');
    const user = utilisateur(requete);
    return this.cahier.listerPieces(user.id, user.roles, id);
  }

  @Post('seances/:id/pieces')
  @Acces('delegue')
  @UseInterceptors(
    FileInterceptor('fichier', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  ajouterPiece(
    @Req() requete: RequeteAuthentifiee,
    @Param('id') idBrut: string,
    @UploadedFile()
    fichier:
      { originalname: string; mimetype: string; buffer: Buffer } | undefined,
  ) {
    const id = lireId(idBrut);
    if (id === null || !fichier)
      throw new BadRequestException('Séance ou fichier invalide');
    const signatures: Record<string, (buffer: Buffer) => boolean> = {
      'application/pdf': (buffer) =>
        buffer.subarray(0, 5).toString() === '%PDF-',
      'image/png': (buffer) =>
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': (buffer) =>
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,
    };
    const verifieSignature = signatures[fichier.mimetype];
    if (!verifieSignature || !verifieSignature(fichier.buffer)) {
      throw new BadRequestException(
        'Seuls les fichiers PDF, PNG et JPEG valides sont acceptés',
      );
    }
    const nomBrut = fichier.originalname.split(/[\\/]/).pop() ?? 'piece-jointe';
    const nom = Array.from(nomBrut)
      .filter((caractere) => {
        const code = caractere.charCodeAt(0);
        return code >= 32 && (code < 0x7f || code > 0x9f);
      })
      .join('')
      .slice(0, 200);
    if (!nom) throw new BadRequestException('Nom de fichier invalide');
    return this.cahier.ajouterPiece(utilisateur(requete).id, id, {
      nom,
      mime: fichier.mimetype,
      contenu: fichier.buffer,
    });
  }

  @Get('pieces/:id')
  @Acces('delegue', 'enseignant', 'etudiant')
  async telechargerPiece(
    @Req() requete: RequeteAuthentifiee,
    @Param('id') idBrut: string,
  ) {
    const id = lireId(idBrut);
    if (id === null)
      throw new BadRequestException('id doit être un entier positif');
    const user = utilisateur(requete);
    const fichier = await this.cahier.telechargerPiece(user.id, user.roles, id);
    const nomEncode = encodeURIComponent(fichier.nom);
    return new StreamableFile(fichier.contenu, {
      type: fichier.mime,
      disposition: `attachment; filename*=UTF-8''${nomEncode}`,
    });
  }
}
