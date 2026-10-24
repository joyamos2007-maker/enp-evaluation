import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { lireId } from '../evaluation/campagnes.validation';
import { ResultatsService } from './resultats.service';

@Controller('resultats')
export class ResultatsController {
  private readonly logger = new Logger(ResultatsController.name);

  constructor(
    private readonly resultats: ResultatsService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get('mes-ues')
  @Header('Cache-Control', 'no-store')
  @Acces('enseignant')
  mesUes(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.resultats.mesUes(utilisateur.id);
  }

  // ueId designe un ref.course.
  @Get('ues/:ueId')
  @Header('Cache-Control', 'no-store')
  @Acces('enseignant', 'chef_departement', 'scolarite', 'admin')
  async fiche(
    @Param('ueId') ueIdBrut: string,
    @Query('campagneId') campagneIdBrut: string | undefined,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');

    const courseId = lireId(ueIdBrut);
    const campagneId = lireId(campagneIdBrut);
    if (courseId === null || campagneId === null) {
      throw new BadRequestException('ueId (dans l URL) et campagneId (parametre) : entiers positifs obligatoires');
    }

    const campusId = utilisateur.roles.includes('scolarite')
      ? await this.campusScope.forScolarite(utilisateur.id, utilisateur.roles)
      : null;
    const departmentId = utilisateur.roles.includes('chef_departement')
      ? await this.campusScope.forChefDepartement(utilisateur.id, utilisateur.roles)
      : null;
    const fiche = await this.resultats.fiche(
      utilisateur,
      courseId,
      campagneId,
      campusId,
      departmentId,
    );
    // Journal : qui consulte quoi, jamais les resultats eux-memes
    this.logger.log(
      'Consultation des resultats : utilisateur ' + utilisateur.id + ', UE ' + courseId + ', campagne ' + campagneId,
    );
    return fiche;
  }
}