import { Module } from '@nestjs/common';
import { ResultatsModule } from '../resultats/resultats.module';
import { DirectionEtudesController, StatistiquesEnpController } from './direction-etudes.controller';
import { DirectionEtudesService } from './direction-etudes.service';

@Module({
  imports: [ResultatsModule],
  controllers: [DirectionEtudesController, StatistiquesEnpController],
  providers: [DirectionEtudesService],
})
export class DirectionEtudesModule {}
