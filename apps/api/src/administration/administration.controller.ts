import { BadRequestException, Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { AdministrationService } from './administration.service';

function nomValide(corps: unknown): string {
  const nom = (corps as { nom?: unknown } | null)?.nom;
  if (typeof nom !== 'string' || !nom.trim() || nom.trim().length > 150) {
    throw new BadRequestException('nom obligatoire (150 caractères maximum)');
  }
  return nom.trim();
}

function idValide(corps: unknown, cle: 'campusId' | 'departmentId' | 'userId'): number {
  const id = (corps as Record<string, unknown> | null)?.[cle];
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException(cle + ' doit être un entier positif');
  }
  return id;
}

@Controller('administration')
@Acces('admin')
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}

  @Get('referentiels')
  @Acces('admin', 'direction_etudes')
  referentiels(@Req() requete: RequeteAuthentifiee) {
    const roles = requete.utilisateur?.roles ?? [];
    return this.administration.referentiels(!roles.includes('admin'));
  }

  @Post('campus')
  @Acces('admin', 'direction_etudes')
  creerCampus(@Body() corps: unknown) {
    return this.administration.creerCampus(nomValide(corps));
  }

  @Post('departements')
  @Acces('admin')
  creerDepartement(@Body() corps: unknown) {
    return this.administration.creerDepartement(
      idValide(corps, 'campusId'),
      nomValide(corps),
    );
  }

  @Post('programmes')
  @Acces('admin')
  creerProgramme(@Body() corps: unknown) {
    return this.administration.creerProgramme(
      idValide(corps, 'departmentId'),
      nomValide(corps),
    );
  }

  @Get('scolarites')
  @Acces('admin')
  listerScolarites() {
    return this.administration.listerScolarites();
  }

  @Post('scolarites')
  @Acces('admin')
  affecterScolarite(@Body() corps: unknown) {
    return this.administration.affecterScolarite(
      idValide(corps, 'userId'),
      idValide(corps, 'campusId'),
    );
  }
}
