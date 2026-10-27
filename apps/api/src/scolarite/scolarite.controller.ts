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
  @Acces('scolarite', 'admin')
  tableauDeBord(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.tableauDeBord(utilisateur.id, utilisateur.roles);
  }

  @Get('deliberations-examens')
  @Acces('scolarite', 'admin')
  deliberationsExamens(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.deliberationsExamens(utilisateur.id, utilisateur.roles);
  }

  @Get('deliberations-examens/:assessmentId')
  @Acces('scolarite', 'admin')
  detailsDeliberationExamen(
    @Req() requete: RequeteAuthentifiee,
    @Param('assessmentId') assessmentIdBrut: string,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.detailsDeliberationExamen(
      utilisateur.id,
      utilisateur.roles,
      idValide(assessmentIdBrut),
    );
  }

  @Post('deliberations-examens/:assessmentId')
  @Acces('scolarite', 'admin')
  delibererExamen(
    @Req() requete: RequeteAuthentifiee,
    @Param('assessmentId') assessmentIdBrut: string,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.delibererExamen(
      utilisateur.id,
      utilisateur.roles,
      idValide(assessmentIdBrut),
    );
  }
}

@Controller('referentiels')
export class ReferentielsController {
  constructor(private readonly scolarite: ScolariteService) {}

  @Get('departements')
  @Acces('scolarite', 'admin')
  departements(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.scolarite.departements(utilisateur.id, utilisateur.roles);
  }
}
