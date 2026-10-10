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
import {ImportsModule} from './imports/imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    EvaluationModule,
	ResultatsModule,
	ModerationModule,
	ImportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}