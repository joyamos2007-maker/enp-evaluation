import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequeteAuthentifiee } from './auth.types';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exiges = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Aucun role exige : toute personne connectee peut passer
    if (!exiges || exiges.length === 0) return true;

    const requete = context.switchToHttp().getRequest<RequeteAuthentifiee>();
    const roles = requete.utilisateur?.roles ?? [];

    // Un seul des roles exiges suffit
    if (!exiges.some((role) => roles.includes(role))) {
      throw new ForbiddenException('Acces refuse pour votre role');
    }
    return true;
  }
}