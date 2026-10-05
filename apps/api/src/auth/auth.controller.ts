import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { RequeteAuthentifiee } from './auth.types';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() corps: unknown) {
    const { identifiant, motDePasse } = (corps ?? {}) as Record<string, unknown>;
    if (
      typeof identifiant !== 'string' ||
      typeof motDePasse !== 'string' ||
      identifiant.length < 1 ||
      identifiant.length > 255 ||
      motDePasse.length < 1 ||
      motDePasse.length > 200
    ) {
      throw new BadRequestException('Les champs identifiant et motDePasse sont obligatoires');
    }
    return this.auth.connecter(identifiant.trim(), motDePasse);
  }

  @Get('me')
  moi(@Req() requete: RequeteAuthentifiee) {
    return requete.utilisateur;
  }
}