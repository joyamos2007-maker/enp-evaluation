import { Module } from '@nestjs/common';
import { BallotTokenService } from './ballot-token.service';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { JetonsService } from './jetons.service';

@Module({
  controllers: [CampagnesController, EvaluationsController],
  providers: [CampagnesService, EvaluationsService, JetonsService, BallotTokenService],
})
export class EvaluationModule {}