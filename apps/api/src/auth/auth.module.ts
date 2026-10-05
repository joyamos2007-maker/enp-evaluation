import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DiagnosticController } from './diagnostic.controller';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, DiagnosticController],
  providers: [PasswordService, TokenService, AuthService, AuthGuard, RolesGuard],
  exports: [PasswordService, TokenService, AuthGuard, RolesGuard],
})
export class AuthModule {}