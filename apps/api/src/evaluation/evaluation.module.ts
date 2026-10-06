import { Module } from '@nestjs/common';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  controllers: [CampagnesController, EvaluationsController],
  providers: [CampagnesService, EvaluationsService],
})
export class EvaluationModule {}