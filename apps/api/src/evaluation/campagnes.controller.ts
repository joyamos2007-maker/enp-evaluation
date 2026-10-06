import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { Acces } from '../auth/acces.decorator';
import { CampagnesService } from './campagnes.service';
import { lireId, validerCampagne } from './campagnes.validation';

function idOuErreur(valeur: string): number {
  const id = lireId(valeur);
  if (id === null) throw new BadRequestException('Identifiant de campagne invalide');
  return id;
}

@Controller('campagnes')
export class CampagnesController {
  constructor(private readonly campagnes: CampagnesService) {}

  @Post()
  @Acces('scolarite', 'admin')
  async creer(@Body() corps: unknown) {
    const resultat = validerCampagne(corps);
    if (!resultat.ok) throw new BadRequestException(resultat.erreur);
    return this.campagnes.creer(resultat.valeur);
  }

  @Get()
  @Acces('scolarite', 'admin')
  lister() {
    return this.campagnes.lister();
  }

  @Get(':id')
  @Acces('scolarite', 'admin')
  detail(@Param('id') id: string) {
    return this.campagnes.trouver(idOuErreur(id));
  }

  @Post(':id/ouvrir')
  @HttpCode(200)
  @Acces('scolarite', 'admin')
  ouvrir(@Param('id') id: string) {
    return this.campagnes.ouvrir(idOuErreur(id));
  }

  @Post(':id/cloturer')
  @HttpCode(200)
  @Acces('scolarite', 'admin')
  cloturer(@Param('id') id: string) {
    return this.campagnes.cloturer(idOuErreur(id));
  }
}