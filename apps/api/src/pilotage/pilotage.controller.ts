import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { lireId } from '../evaluation/campagnes.validation';
import { PilotageService } from './pilotage.service';

@Controller('pilotage')
@Acces('chef_departement')
export class PilotageController {
  constructor(
    private readonly pilotage: PilotageService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get('campagnes')
  async campagnes(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const departmentId = await this.campusScope.forChefDepartement(
      utilisateur.id,
      utilisateur.roles,
    );
    return this.pilotage.campagnes(departmentId);
  }

  @Get('campagnes/:campagneId/participation')
  async participation(
    @Param('campagneId') campagneIdBrut: string,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('Identifiant de campagne invalide');
    const departmentId = await this.campusScope.forChefDepartement(
      utilisateur.id,
      utilisateur.roles,
    );
    return this.pilotage.participation(campagneId, departmentId);
  }

  @Get('campagnes/:campagneId/synthese')
  async synthese(
    @Param('campagneId') campagneIdBrut: string,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('Identifiant de campagne invalide');
    const departmentId = await this.campusScope.forChefDepartement(
      utilisateur.id,
      utilisateur.roles,
    );
    return this.pilotage.synthese(campagneId, departmentId);
  }

  @Get('campagnes/:campagneId/suites')
  async lireSuites(
    @Param('campagneId') campagneIdBrut: string,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('Identifiant de campagne invalide');
    const departmentId = await this.campusScope.forChefDepartement(
      utilisateur.id,
      utilisateur.roles,
    );
    return this.pilotage.lireSuites(campagneId, departmentId);
  }

  @Put('campagnes/:campagneId/suites')
  async enregistrerSuites(
    @Param('campagneId') campagneIdBrut: string,
    @Body() corps: unknown,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campagneId = lireId(campagneIdBrut);
    if (campagneId === null) throw new BadRequestException('Identifiant de campagne invalide');
    const departmentId = await this.campusScope.forChefDepartement(
      utilisateur.id,
      utilisateur.roles,
    );
    return this.pilotage.enregistrerSuites(
      campagneId,
      departmentId,
      utilisateur.id,
      corps,
    );
  }
}
