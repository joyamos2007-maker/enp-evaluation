import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CampusScopeService } from '../database/campus-scope.service';
import { Acces } from './acces.decorator';
import type { RequeteAuthentifiee } from './auth.types';
import { IdentityService } from './identity.service';

@Controller('comptes')
export class ActivationCodesController {
  constructor(
    private readonly identity: IdentityService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Post('codes-activation')
  @Acces('scolarite', 'admin')
  generer(
    @Req() requete: RequeteAuthentifiee,
    @Body() body: { tousSansMotDePasse?: boolean; identifiants?: string[] },
  ) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (body?.tousSansMotDePasse !== true && !Array.isArray(body?.identifiants)) {
      throw new BadRequestException('Précisez tousSansMotDePasse ou une liste d’identifiants');
    }
    return this.campusScope
      .forScolarite(requete.utilisateur.id, requete.utilisateur.roles)
      .then((campusId) => this.identity.genererCodesActivation(campusId, body));
  }
}
