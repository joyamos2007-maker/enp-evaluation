import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BallotsService } from './ballots.service';
import { validerBulletin } from './ballots.validation';

@Controller('ballots')
export class BallotsController {
  constructor(private readonly ballots: BallotsService) {}

  // Route publique : seul le jeton de vote compte. Cette methode ne recoit
  // volontairement que le corps : ni la requete, ni l'adresse IP, ni les en-tetes.
  @Public()
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async deposer(@Body() corps: unknown) {
    await this.ballots.deposer(validerBulletin(corps));
    return { ok: true };
  }
}