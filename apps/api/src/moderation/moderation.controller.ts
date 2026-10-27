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
import { CampusScopeService } from '../database/campus-scope.service';
import { lireId } from '../evaluation/campagnes.validation';
import { ModerationService } from './moderation.service';
import { lireRefCommentaire, validerDecision, validerFiltreStatut } from './moderation.validation';

// Reserve a la Scolarite : l'administrateur technique ne lit jamais les commentaires.
@Controller('moderation')
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor(
    private readonly moderation: ModerationService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get('commentaires')
  @Header('Cache-Control', 'no-store')
  @Acces('scolarite')
  async lister(
    @Query('campagneId') campagneIdBrut: string | undefined,
    @Query('statut') statutBrut: string | undefined,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('campagneId : entier positif obligatoire');
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.moderation.lister(campagneId, validerFiltreStatut(statutBrut), campusId);
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

    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    const resultat = await this.moderation.decider(ref, decision, utilisateur.id, campusId);
    // Journal : qui decide quoi, jamais le texte du commentaire
    this.logger.log(
      'Moderation : utilisateur ' + utilisateur.id + ', commentaire ' + idBrut + ', decision ' + decision,
    );
    return resultat;
  }
}