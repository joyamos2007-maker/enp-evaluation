import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequeteAuthentifiee } from './auth.types';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const requete = context.switchToHttp().getRequest<RequeteAuthentifiee>();
    const entete = requete.headers['authorization'];
    const valeur = Array.isArray(entete) ? entete[0] : entete;

    if (!valeur || !valeur.startsWith('Bearer ')) {
      throw new UnauthorizedException('Jeton manquant');
    }
    const contenu = this.tokens.verifierAcces(valeur.slice(7).trim());
    if (!contenu) {
      throw new UnauthorizedException('Jeton invalide ou expire');
    }
    requete.utilisateur = { id: Number(contenu.sub), roles: contenu.roles };
    return true;
  }
}