import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import type { Role } from './roles';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * Protege une route : exige un jeton valide, puis (si des roles sont
 * indiques) au moins un de ces roles.
 *   @Acces()                       -> toute personne connectee
 *   @Acces('scolarite', 'admin')   -> scolarite OU admin
 */
export function Acces(...roles: Role[]) {
  return applyDecorators(UseGuards(AuthGuard, RolesGuard), Roles(...roles));
}