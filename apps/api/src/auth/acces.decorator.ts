import type { Role } from './roles';
import { Roles } from './roles.decorator';

/**
 * Indique quels roles peuvent utiliser une route.
 * Le jeton est verifie par le portier global (AuthGuard) : toute route est
 * protegee par defaut, sauf celles marquees @Public().
 *   @Acces()                       -> toute personne connectee
 *   @Acces('scolarite', 'admin')   -> scolarite OU admin
 */
export function Acces(...roles: Role[]) {
  return Roles(...roles);
}