import { Module } from '@nestjs/common';
import { BallotDatabaseService } from './ballot-database.service';
import { BallotTokenService } from './ballot-token.service';
import { BallotsController } from './ballots.controller';
import { BallotsService } from './ballots.service';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { JetonsService } from './jetons.service';

@Module({
  controllers: [CampagnesController, EvaluationsController, BallotsController],
  providers: [
    CampagnesService,
    EvaluationsService,
    JetonsService,
    BallotTokenService,
    BallotDatabaseService,
    BallotsService,
  ],
})
export class EvaluationModule {}