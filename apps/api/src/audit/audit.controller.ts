import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { CampusScopeService } from '../database/campus-scope.service';
import { AuditService } from './audit.service';

@Controller('audit')
@Acces('admin', 'scolarite')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly campusScope: CampusScopeService,
  ) {}

  @Get()
  async lister(
    @Query('limite') limiteBrute: string | undefined,
    @Req() requete: RequeteAuthentifiee,
  ) {
    const limite = limiteBrute === undefined ? 100 : Number(limiteBrute);
    if (!Number.isSafeInteger(limite) || limite < 1 || limite > 200) {
      throw new BadRequestException(
        'limite doit être un entier compris entre 1 et 200',
      );
    }
    const utilisateur = requete.utilisateur;
    if (!utilisateur) throw new UnauthorizedException('Jeton manquant');
    const campusId =
      utilisateur.activeRole === 'scolarite'
        ? await this.campusScope.forScolarite(utilisateur.id, [
            utilisateur.activeRole,
          ])
        : null;
    return this.audit.lister(limite, campusId);
  }
}
