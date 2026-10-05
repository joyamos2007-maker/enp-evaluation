import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { ReponseHttp, RequeteAuthentifiee } from './auth.types';
import { lireCookie } from './cookies';
import { Public } from './public.decorator';

export const NOM_COOKIE_SESSION = 'refresh_token';
const CHEMIN_COOKIE = '/api/v1/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() corps: unknown, @Res({ passthrough: true }) reponse: ReponseHttp) {
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
    const { refresh, ...corpsReponse } = await this.auth.connecter(identifiant.trim(), motDePasse);
    this.poserCookie(reponse, refresh.jeton, refresh.expireLe);
    return corpsReponse;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async rafraichir(
    @Req() requete: RequeteAuthentifiee,
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    const jeton = lireCookie(requete.headers['cookie'], NOM_COOKIE_SESSION);
    if (!jeton) throw new UnauthorizedException('Session absente');

    const { refresh, ...corpsReponse } = await this.auth.rafraichir(jeton);
    this.poserCookie(reponse, refresh.jeton, refresh.expireLe);
    return corpsReponse;
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async deconnecter(
    @Req() requete: RequeteAuthentifiee,
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    const jeton = lireCookie(requete.headers['cookie'], NOM_COOKIE_SESSION);
    if (jeton) await this.auth.deconnecter(jeton);
    this.effacerCookie(reponse);
    return { ok: true };
  }

  @Get('me')
  moi(@Req() requete: RequeteAuthentifiee) {
    return requete.utilisateur;
  }

  private enProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private poserCookie(reponse: ReponseHttp, jeton: string, expireLe: Date): void {
    reponse.cookie(NOM_COOKIE_SESSION, jeton, {
      httpOnly: true,
      secure: this.enProduction(),
      sameSite: 'strict',
      path: CHEMIN_COOKIE,
      expires: expireLe,
    });
  }

  private effacerCookie(reponse: ReponseHttp): void {
    reponse.clearCookie(NOM_COOKIE_SESSION, {
      httpOnly: true,
      secure: this.enProduction(),
      sameSite: 'strict',
      path: CHEMIN_COOKIE,
    });
  }
}