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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';
import type { ReponseHttp, RequeteAuthentifiee } from './auth.types';
import { lireCookie } from './cookies';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

export const NOM_COOKIE_SESSION = 'refresh_token';
export const NOM_COOKIE_APPAREIL_MFA = 'mfa_trusted_device';
const CHEMIN_COOKIE = '/api/v1/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly identity: IdentityService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion utilisateur et génération du token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie.' })
  @ApiResponse({ status: 400, description: 'Identifiant ou mot de passe invalide.' })
  async login(
    @Req() requete: RequeteAuthentifiee,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    const { identifiant, motDePasse } = dto ?? {};
    if (
      typeof identifiant !== 'string' ||
      typeof motDePasse !== 'string' ||
      identifiant.length < 1 ||
      identifiant.length > 255 ||
      motDePasse.length < 1 ||
      motDePasse.length > 200
    ) {
      throw new BadRequestException(
        'Les champs identifiant et motDePasse sont obligatoires',
      );
    }
    const resultat = await this.auth.connecter(
      identifiant.trim(),
      motDePasse,
      lireCookie(requete.headers['cookie'], NOM_COOKIE_APPAREIL_MFA),
    );
    if ('mfaRequired' in resultat) return resultat;
    const { refresh, ...corpsReponse } = resultat;
    this.poserCookie(reponse, refresh.jeton, refresh.expireLe);
    return corpsReponse;
  }

  @Public()
  @Post('activate')
  @HttpCode(200)
  async activer(@Body() body: { identifiant?: string; codeActivation?: string; motDePasse?: string }) {
    if (
      typeof body?.identifiant !== 'string' ||
      typeof body.codeActivation !== 'string' ||
      typeof body.motDePasse !== 'string'
    ) {
      throw new BadRequestException('Identifiant, code et mot de passe sont obligatoires');
    }
    await this.identity.activer(
      body.identifiant,
      body.codeActivation.trim(),
      body.motDePasse,
    );
    return { ok: true };
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(200)
  async demanderReinitialisation(@Body() body: { identifiant?: string }) {
    if (typeof body?.identifiant !== 'string' || body.identifiant.trim().length > 255) {
      throw new BadRequestException('Un identifiant valide est obligatoire');
    }
    await this.identity.demanderReinitialisation(body.identifiant);
    return { ok: true };
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(200)
  async reinitialiserMotDePasse(
    @Body() body: { identifiant?: string; code?: string; motDePasse?: string },
  ) {
    if (
      typeof body?.identifiant !== 'string' ||
      typeof body.code !== 'string' ||
      typeof body.motDePasse !== 'string'
    ) {
      throw new BadRequestException('Identifiant, code et mot de passe sont obligatoires');
    }
    await this.identity.reinitialiser(body.identifiant, body.code.trim(), body.motDePasse);
    return { ok: true };
  }

  @Post('password/change')
  @HttpCode(200)
  async changerMotDePasse(
    @Req() requete: RequeteAuthentifiee,
    @Body() body: { motDePasseActuel?: string; nouveauMotDePasse?: string },
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (
      typeof body?.motDePasseActuel !== 'string' ||
      body.motDePasseActuel.length < 1 ||
      body.motDePasseActuel.length > 200 ||
      typeof body.nouveauMotDePasse !== 'string'
    ) {
      throw new BadRequestException('Les mots de passe actuel et nouveau sont obligatoires');
    }
    await this.identity.changerMotDePasse(
      requete.utilisateur.id,
      body.motDePasseActuel,
      body.nouveauMotDePasse,
    );
    this.effacerCookie(reponse);
    this.effacerCookieAppareilMfa(reponse);
    return { ok: true };
  }

  @Post('email/change/request')
  @HttpCode(200)
  async demanderChangementEmail(
    @Req() requete: RequeteAuthentifiee,
    @Body() body: { nouvelleAdresse?: string; motDePasseActuel?: string },
  ) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (
      typeof body?.nouvelleAdresse !== 'string' ||
      typeof body.motDePasseActuel !== 'string' ||
      body.motDePasseActuel.length < 1 ||
      body.motDePasseActuel.length > 200
    ) {
      throw new BadRequestException(
        'Une adresse e-mail et le mot de passe actuel sont obligatoires',
      );
    }
    await this.identity.demanderChangementEmail(
      requete.utilisateur.id,
      body.nouvelleAdresse,
      body.motDePasseActuel,
    );
    return { ok: true };
  }

  @Post('email/change/confirm')
  @HttpCode(200)
  async confirmerChangementEmail(
    @Req() requete: RequeteAuthentifiee,
    @Body() body: { code?: string },
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (typeof body?.code !== 'string') {
      throw new BadRequestException('Code de vérification obligatoire');
    }
    await this.identity.confirmerChangementEmail(
      requete.utilisateur.id,
      body.code.trim(),
    );
    this.effacerCookie(reponse);
    this.effacerCookieAppareilMfa(reponse);
    return { ok: true };
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(200)
  async verifierMfa(
    @Body() body: {
      challengeId?: string;
      method?: string;
      code?: string;
      rememberDevice?: boolean;
    },
    @Res({ passthrough: true }) reponse: ReponseHttp,
  ) {
    if (
      typeof body?.challengeId !== 'string' ||
      typeof body.method !== 'string' ||
      typeof body.code !== 'string' ||
      (body.rememberDevice !== undefined && typeof body.rememberDevice !== 'boolean')
    ) {
      throw new BadRequestException('Challenge, méthode et code MFA sont obligatoires');
    }
    const resultat = await this.auth.verifierMfa(
      body.challengeId,
      body.method,
      body.code.trim(),
      body.rememberDevice === true,
    );
    const { refresh, appareilMfa, ...corpsReponse } = resultat;
    if (appareilMfa) {
      this.poserCookieAppareilMfa(reponse, appareilMfa.jeton, appareilMfa.expireLe);
    }
    this.poserCookie(reponse, refresh.jeton, refresh.expireLe);
    return corpsReponse;
  }

  @Post('mfa/totp/setup')
  async preparerTotp(@Req() requete: RequeteAuthentifiee) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.identity.preparerTotp(requete.utilisateur.id);
  }

  @Get('mfa/status')
  async statutMfa(@Req() requete: RequeteAuthentifiee) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    return this.identity.statutMfa(requete.utilisateur.id);
  }

  @Post('mfa/totp/verify')
  @HttpCode(200)
  async activerTotp(@Req() requete: RequeteAuthentifiee, @Body() body: { code?: string }) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (typeof body?.code !== 'string') throw new BadRequestException('Code TOTP obligatoire');
    await this.identity.activerTotp(requete.utilisateur.id, body.code.trim());
    return { ok: true };
  }

  @Post('mfa/totp/disable')
  @HttpCode(200)
  async desactiverTotp(@Req() requete: RequeteAuthentifiee, @Body() body: { code?: string }) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (typeof body?.code !== 'string') throw new BadRequestException('Code TOTP obligatoire');
    await this.identity.desactiverTotp(requete.utilisateur.id, body.code.trim());
    return { ok: true };
  }

  @Post('profil-actif')
  @HttpCode(200)
  async selectionnerProfil(
    @Req() requete: RequeteAuthentifiee,
    @Body() body: { role?: string },
  ) {
    if (!requete.utilisateur) throw new UnauthorizedException('Jeton manquant');
    if (typeof body?.role !== 'string') throw new BadRequestException('Profil obligatoire');
    const refreshToken = lireCookie(requete.headers['cookie'], NOM_COOKIE_SESSION);
    if (!refreshToken) throw new UnauthorizedException('Session absente');
    const resultat = await this.auth.selectionnerProfil(
      requete.utilisateur.id,
      body.role,
      refreshToken,
    );
    return resultat;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rafraîchir le jeton d’accès via cookie de session' })
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
  @ApiOperation({ summary: 'Déconnexion et suppression du cookie' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le profil de l’utilisateur connecté' })
  moi(@Req() requete: RequeteAuthentifiee) {
    return requete.utilisateur;
  }

  private enProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private poserCookie(
    reponse: ReponseHttp,
    jeton: string,
    expireLe: Date,
  ): void {
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

  private poserCookieAppareilMfa(
    reponse: ReponseHttp,
    jeton: string,
    expireLe: Date,
  ): void {
    reponse.cookie(NOM_COOKIE_APPAREIL_MFA, jeton, {
      httpOnly: true,
      secure: this.enProduction(),
      sameSite: 'strict',
      path: CHEMIN_COOKIE,
      expires: expireLe,
    });
  }

  private effacerCookieAppareilMfa(reponse: ReponseHttp): void {
    reponse.clearCookie(NOM_COOKIE_APPAREIL_MFA, {
      httpOnly: true,
      secure: this.enProduction(),
      sameSite: 'strict',
      path: CHEMIN_COOKIE,
    });
  }
}