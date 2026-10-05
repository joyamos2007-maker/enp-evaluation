import { Controller, Get } from '@nestjs/common';
import { Acces } from './acces.decorator';

// TEMPORAIRE : routes de test des roles. A supprimer avant la production.
@Controller('diagnostic')
export class DiagnosticController {
  @Get('connecte')
  @Acces()
  connecte() {
    return { ok: true, zone: 'toute personne connectee' };
  }

  @Get('etudiant')
  @Acces('etudiant')
  etudiant() {
    return { ok: true, zone: 'etudiants' };
  }

  @Get('scolarite')
  @Acces('scolarite', 'admin')
  scolarite() {
    return { ok: true, zone: 'scolarite ou admin' };
  }
}