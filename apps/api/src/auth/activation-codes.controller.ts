import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CampusScopeService } from '../database/campus-scope.service';
import { Acces } from './acces.decorator';
import type { RequeteAuthentifiee } from './auth.types';
import { IdentityService } from './identity.service';
import { EmailService } from './email.service';

@Controller('comptes')
export class ActivationCodesController {
  constructor(
    private readonly identity: IdentityService,
    private readonly campusScope: CampusScopeService,
    private readonly email: EmailService,
  ) {}

  @Post('smtp-verification')
  @Acces('scolarite', 'admin')
  async verifierSmtp() {
    try {
      await this.email.verifier();
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException(
        'Le serveur SMTP est inaccessible ou refuse l’authentification.',
      );
    }
  }

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
      .forScolarite(requete.utilisateur.id, [requete.utilisateur.activeRole])
      .then((campusId) => this.identity.genererCodesActivation(campusId, body));
  }
}
