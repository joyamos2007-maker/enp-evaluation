import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from './campagnes.validation';
import { RestitutionService } from './restitution.service';
import { validerRestitution } from './restitution.validation';

@Controller()
export class RestitutionController {
  private readonly logger = new Logger(RestitutionController.name);

  constructor(private readonly restitution: RestitutionService) {}

  @Post('campagnes/:id/restitution')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Acces('scolarite')
  async publier(
    @Param('id') idBrut: string,
    @Body() corps: unknown,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');

    const campagneId = lireId(idBrut);
    if (campagneId === null) throw new BadRequestException('Identifiant de campagne invalide');
    const entree = validerRestitution(corps);

    const campagne = await this.restitution.publier(campagneId, utilisateur.id, entree);
    this.logger.log('Restitution publiee : utilisateur ' + utilisateur.id + ', campagne ' + campagneId);
    return campagne;
  }

  @Get('restitutions')
  @Header('Cache-Control', 'no-store')
  @Acces('etudiant', 'delegue')
  mesRestitutions(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.restitution.pourEtudiant(utilisateur.id);
  }
}