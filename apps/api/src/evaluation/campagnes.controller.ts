import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { CampagnesService } from './campagnes.service';
import { lireId, validerCampagne } from './campagnes.validation';

function idOuErreur(valeur: string): number {
  const id = lireId(valeur);
  if (id === null) throw new BadRequestException('Identifiant de campagne invalide');
  return id;
}

@Controller('campagnes')
export class CampagnesController {
  constructor(
    private readonly campagnes: CampagnesService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Post()
  @Acces('scolarite', 'admin')
  async creer(@Body() corps: unknown, @Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    const resultat = validerCampagne(corps);
    if (!resultat.ok) throw new BadRequestException(resultat.erreur);
    await this.campusScope.verifierDepartement(resultat.valeur.departmentId, campusId);
    return this.campagnes.creer(resultat.valeur, campusId);
  }

  @Get()
  @Acces('scolarite', 'admin')
  async lister(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.campagnes.lister(campusId);
  }

  @Get(':id')
  @Acces('scolarite', 'admin')
  async detail(@Param('id') id: string, @Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.campagnes.trouver(idOuErreur(id), campusId);
  }

  @Post(':id/ouvrir')
  @HttpCode(200)
  @Acces('scolarite', 'admin')
  async ouvrir(@Param('id') id: string, @Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.campagnes.ouvrir(idOuErreur(id), campusId);
  }

  @Post(':id/cloturer')
  @HttpCode(200)
  @Acces('scolarite', 'admin')
  async cloturer(@Param('id') id: string, @Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles);
    return this.campagnes.cloturer(idOuErreur(id), campusId);
  }
}