import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from './campagnes.validation';
import { EvaluationsService } from './evaluations.service';
import { JetonsService } from './jetons.service';

@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluations: EvaluationsService,
    private readonly jetons: JetonsService,
  ) {}

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

  // ueId designe un ref.course. L'identite de l'etudiant vient UNIQUEMENT du
  // jeton de connexion, jamais du corps de la requete.
  @Post(':ueId/jeton')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Acces('etudiant', 'delegue')
  async jeton(
    @Param('ueId') ueIdBrut: string,
    @Body() corps: unknown,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');

    const courseId = lireId(ueIdBrut);
    const { campagneId } = (corps ?? {}) as Record<string, unknown>;
    if (
      courseId === null ||
      typeof campagneId !== 'number' ||
      !Number.isInteger(campagneId) ||
      campagneId < 1 ||
      campagneId > 999999999
    ) {
      throw new BadRequestException(
        'ueId (dans l URL) et campagneId (dans le corps) : entiers positifs obligatoires',
      );
    }
    return this.jetons.emettre(utilisateur.id, courseId, campagneId);
  }
}