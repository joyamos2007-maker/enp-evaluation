import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from './campagnes.validation';
import { EvaluationsService } from './evaluations.service';

@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get('a-faire')
  @Acces('etudiant', 'delegue')
  aFaire(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.evaluations.aFaire(utilisateur.id);
  }

  @Get('questionnaire')
  @Acces('etudiant', 'delegue')
  questionnaire(@Query('campagneId') campagneId: string | undefined) {
    const id = lireId(campagneId);
    if (id === null) throw new BadRequestException('campagneId : entier positif obligatoire');
    return this.evaluations.questionnaire(id);
  }
}