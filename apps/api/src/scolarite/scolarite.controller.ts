import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from '../evaluation/campagnes.validation';
import { ScolariteService } from './scolarite.service';

function idValide(brut: string) {
  const id = lireId(brut);
  if (id === null) throw new BadRequestException('assessmentId doit être un entier positif');
  return id;
}

@Controller('scolarite')
export class ScolariteController {
  constructor(private readonly scolarite: ScolariteService) {}

  @Get('tableau-de-bord')
  @Acces('scolarite')
  tableauDeBord(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.tableauDeBord(utilisateur.id, [utilisateur.activeRole]);
  }

  @Get('deliberations-examens')
  @Acces('scolarite')
  deliberationsExamens(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.deliberationsExamens(utilisateur.id, [utilisateur.activeRole]);
  }

  @Get('deliberations-examens/:assessmentId')
  @Acces('scolarite')
  detailsDeliberationExamen(
    @Req() requete: RequeteAuthentifiee,
    @Param('assessmentId') assessmentIdBrut: string,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.detailsDeliberationExamen(
      utilisateur.id,
      [utilisateur.activeRole],
      idValide(assessmentIdBrut),
    );
  }

  @Post('deliberations-examens/:assessmentId')
  @Acces('scolarite')
  delibererExamen(
    @Req() requete: RequeteAuthentifiee,
    @Param('assessmentId') assessmentIdBrut: string,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.delibererExamen(
      utilisateur.id,
      [utilisateur.activeRole],
      idValide(assessmentIdBrut),
    );
  }
}

@Controller('referentiels')
export class ReferentielsController {
  constructor(private readonly scolarite: ScolariteService) {}

  @Get('departements')
  @Acces('scolarite')
  departements(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.departements(utilisateur.id, [utilisateur.activeRole]);
  }
}
