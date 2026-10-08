import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { lireId } from '../evaluation/campagnes.validation';
import { ModerationService } from './moderation.service';
import { lireRefCommentaire, validerDecision, validerFiltreStatut } from './moderation.validation';

// Reserve a la Scolarite : l'administrateur technique ne lit jamais les commentaires.
@Controller('moderation')
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor(private readonly moderation: ModerationService) {}

  @Get('commentaires')
  @Header('Cache-Control', 'no-store')
  @Acces('scolarite')
  lister(
    @Query('campagneId') campagneIdBrut: string | undefined,
    @Query('statut') statutBrut: string | undefined,
  ) {
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('campagneId : entier positif obligatoire');
    return this.moderation.lister(campagneId, validerFiltreStatut(statutBrut));
  }

  @Patch('commentaires/:id')
  @Header('Cache-Control', 'no-store')
  @Acces('scolarite')
  async decider(
    @Param('id') idBrut: string,
    @Body() corps: unknown,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');

    const ref = lireRefCommentaire(idBrut);
    if (!ref) throw new BadRequestException('Identifiant de commentaire invalide');
    const decision = validerDecision(corps);

    const resultat = await this.moderation.decider(ref, decision, utilisateur.id);
    // Journal : qui decide quoi, jamais le texte du commentaire
    this.logger.log(
      'Moderation : utilisateur ' + utilisateur.id + ', commentaire ' + idBrut + ', decision ' + decision,
    );
    return resultat;
  }
}