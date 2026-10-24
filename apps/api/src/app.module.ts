import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ResultatsModule } from './resultats/resultats.module';
import { ModerationModule } from './moderation/moderation.module';
import { ImportsModule } from './imports/imports.module';
import { ScolariteModule } from './scolarite/scolarite.module';
import { AdministrationModule } from './administration/administration.module';
import { DirectionEtudesModule } from './direction-etudes/direction-etudes.module';
import { CahierTexteModule } from './cahier-texte/cahier-texte.module';
import { PilotageModule } from './pilotage/pilotage.module';
import { DossierAcademiqueModule } from './dossier-academique/dossier-academique.module';
import { AcademicManagementModule } from './academic-management/academic-management.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    EvaluationModule,
    ResultatsModule,
    ModerationModule,
    ImportsModule,
    ScolariteModule,
    AdministrationModule,
    DirectionEtudesModule,
    CahierTexteModule,
    PilotageModule,
    DossierAcademiqueModule,
    AcademicManagementModule,
    AuditModule,
    NotificationsModule,
    ExportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
