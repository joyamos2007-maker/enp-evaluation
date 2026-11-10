import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { ScolariteService } from './scolarite.service';

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
