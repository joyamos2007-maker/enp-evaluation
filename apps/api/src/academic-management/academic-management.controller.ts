import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { AcademicManagementService } from './academic-management.service';
import { AnnualArchivesService } from './annual-archives.service';

function entierPositif(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function idPositif(value: string, nom: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new BadRequestException(`${nom} doit être positif`);
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new BadRequestException(`${nom} invalide`);
  return result;
}

@Controller('affectations')
@Acces('scolarite', 'admin')
export class AcademicManagementController {
  constructor(
    private readonly assignments: AcademicManagementService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get('cours/:courseId/enseignants')
  async enseignants(
    @Req() request: RequeteAuthentifiee,
    @Param('courseId') courseId: string,
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.listerEnseignants(idPositif(courseId, 'courseId'), campus);
  }

  @Post('cours/:courseId/enseignants/:userId')
  async ajouterEnseignant(
    @Req() request: RequeteAuthentifiee,
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.ajouterEnseignant(
      idPositif(courseId, 'courseId'),
      idPositif(userId, 'userId'),
      campus,
      user.id,
    );
  }

  @Delete('cours/:courseId/enseignants/:userId')
  async retirerEnseignant(
    @Req() request: RequeteAuthentifiee,
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.retirerEnseignant(
      idPositif(courseId, 'courseId'),
      idPositif(userId, 'userId'),
      campus,
      user.id,
    );
  }

  @Get('programmes/:programId/delegues')
  async delegues(
    @Req() request: RequeteAuthentifiee,
    @Param('programId') programId: string,
    @Query('anneeUniversitaire') year?: string,
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    if (!year) throw new BadRequestException('anneeUniversitaire obligatoire');
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.listerDelegues(idPositif(programId, 'programId'), year, campus);
  }

  @Put('delegues')
  async enregistrerDelegue(
    @Req() request: RequeteAuthentifiee,
    @Body() body: {
      programId?: number;
      userId?: number;
      anneeUniversitaire?: string;
      type?: string;
      debut?: string;
      fin?: string;
    },
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    if (
      !entierPositif(body?.programId) ||
      !entierPositif(body?.userId) ||
      typeof body.anneeUniversitaire !== 'string' ||
      typeof body.type !== 'string' ||
      typeof body.debut !== 'string' ||
      typeof body.fin !== 'string'
    ) {
      throw new BadRequestException('Données de mandat incomplètes');
    }
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.enregistrerDelegue(
      body.programId,
      body.userId,
      body.anneeUniversitaire,
      body.type,
      body.debut,
      body.fin,
      campus,
      user.id,
    );
  }

  @Delete('programmes/:programId/delegues/:type')
  async retirerDelegue(
    @Req() request: RequeteAuthentifiee,
    @Param('programId') programId: string,
    @Param('type') type: string,
    @Query('anneeUniversitaire') year?: string,
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    if (!year) throw new BadRequestException('anneeUniversitaire obligatoire');
    const campus = await this.campusScope.forScolarite(user.id, user.roles);
    return this.assignments.retirerDelegue(
      idPositif(programId, 'programId'),
      year,
      type,
      campus,
      user.id,
    );
  }
}

@Controller('archives/annuelles')
@Acces('admin')
export class AnnualArchivesController {
  constructor(private readonly archives: AnnualArchivesService) {}

  @Get()
  lister() {
    return this.archives.lister();
  }

  @Get(':annee')
  lire(@Param('annee') annee: string) {
    return this.archives.lire(annee);
  }

  @Post()
  creer(
    @Req() request: RequeteAuthentifiee,
    @Body() body: { anneeUniversitaire?: string },
  ) {
    const user = request.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    if (typeof body?.anneeUniversitaire !== 'string') {
      throw new BadRequestException('Année universitaire obligatoire');
    }
    return this.archives.creer(body.anneeUniversitaire, user.id);
  }
}
