import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { UsersService } from './users.service';

@Controller('comptes')
export class ComptesController {
  constructor(
    private readonly users: UsersService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get()
  @Acces('scolarite', 'admin')
  async lister(@Req() requete: RequeteAuthentifiee) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId = await this.campusScope.forScolarite(
      utilisateur.id,
      [utilisateur.activeRole],
    );
    return this.users.listerComptes(campusId);
  }

  @Delete(':id')
  @Acces('scolarite', 'admin')
  async supprimer(
    @Param('id', ParseIntPipe) id: number,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId =
      utilisateur.activeRole === 'scolarite'
        ? await this.campusScope.forScolarite(utilisateur.id, [
            utilisateur.activeRole,
          ])
        : null;
    await this.users.supprimerCompte(
      id,
      utilisateur.id,
      utilisateur.activeRole,
      campusId,
    );
    return { ok: true };
  }
}
