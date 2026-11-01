import { Module } from '@nestjs/common';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { ResultatsModule } from '../resultats/resultats.module';
import { HealthController } from './health.controller';

@Module({
  imports: [EvaluationModule, ResultatsModule],
  controllers: [HealthController],
})
export class HealthModule {}