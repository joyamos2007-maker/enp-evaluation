import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { DirectionEtudesService } from './direction-etudes.service';

interface Periode {
  anneeUniversitaire: string;
  semestre: number;
}

function lirePeriode(valeur: unknown): Periode {
  if (typeof valeur !== 'object' || valeur === null) {
    throw new BadRequestException('anneeUniversitaire et semestre sont obligatoires');
  }
  const corps = valeur as Record<string, unknown>;
  const anneeUniversitaire = corps.anneeUniversitaire;
  const semestre = typeof corps.semestre === 'string' ? Number(corps.semestre) : corps.semestre;
  if (
    typeof anneeUniversitaire !== 'string' ||
    !/^\d{4}-\d{4}$/.test(anneeUniversitaire) ||
    Number(anneeUniversitaire.slice(5)) !== Number(anneeUniversitaire.slice(0, 4)) + 1 ||
    !Number.isSafeInteger(semestre) ||
    (semestre as number) < 1 ||
    (semestre as number) > 10
  ) {
    throw new BadRequestException('Période académique invalide');
  }
  return { anneeUniversitaire, semestre: semestre as number };
}

@Controller('direction')
export class DirectionEtudesController {
  constructor(
    private readonly direction: DirectionEtudesService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get('statistiques')
  @Acces('directeur_campus', 'directeur_general')
  async statistiques(
    @Req() requete: RequeteAuthentifiee,
    @Query('anneeUniversitaire') anneeUniversitaire: string,
    @Query('semestre') semestre: string,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = utilisateur.activeRole === 'directeur_campus'
      ? await this.campusScope.forDirecteurCampus(utilisateur.id, [utilisateur.activeRole])
      : null;
    return this.direction.synthese(
      lirePeriode({ anneeUniversitaire, semestre }),
      campusId,
    );
  }

  @Post('statistiques/publications')
  @Acces('directeur_general')
  publier(
    @Body() corps: unknown,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.direction.publier(lirePeriode(corps), utilisateur.id);
  }

  @Get('controles-academiques')
  @Acces('directeur_campus', 'directeur_general')
  async controles(
    @Req() requete: RequeteAuthentifiee,
    @Query('anneeUniversitaire') anneeUniversitaire: string | undefined,
    @Query('semestre') semestre: string | undefined,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = utilisateur.activeRole === 'directeur_campus'
      ? await this.campusScope.forDirecteurCampus(utilisateur.id, [utilisateur.activeRole])
      : null;
    let periode: Periode | undefined;
    if (anneeUniversitaire !== undefined || semestre !== undefined) {
      periode = lirePeriode({ anneeUniversitaire, semestre });
    }
    return this.direction.controlesAcademiques(periode, campusId);
  }
}

@Controller('statistiques-enp')
export class StatistiquesEnpController {
  constructor(private readonly direction: DirectionEtudesService) {}

  @Get()
  @Acces()
  dernieresPublications() {
    return this.direction.dernieresPublications();
  }
}
