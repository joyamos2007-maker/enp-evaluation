import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequeteAuthentifiee } from '../auth/auth.types';
import { Acces } from '../auth/acces.decorator';
import { lireId } from '../evaluation/campagnes.validation';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Acces()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  lister(@Req() requete: RequeteAuthentifiee) {
    const user = requete.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    return this.notifications.lister(user.id);
  }

  @Post(':id/lue')
  marquerLue(@Req() requete: RequeteAuthentifiee, @Param('id') idBrut: string) {
    const user = requete.utilisateur;
    if (!user) throw new UnauthorizedException('Jeton manquant');
    const id = lireId(idBrut);
    if (id === null) throw new BadRequestException('Identifiant invalide');
    return this.notifications.marquerLue(user.id, id);
  }
}
