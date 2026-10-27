import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { IdentityService } from './identity.service';
import { ActivationCodesController } from './activation-codes.controller';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, ActivationCodesController],
  providers: [
    PasswordService,
    TokenService,
    SessionService,
    EmailService,
    IdentityService,
    AuthService,
    // Portiers globaux, dans cet ordre : d'abord le jeton, ensuite les roles
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PasswordService, TokenService, IdentityService, EmailService],
})
export class AuthModule {}
