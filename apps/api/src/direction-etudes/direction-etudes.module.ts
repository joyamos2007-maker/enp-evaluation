import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ResultatsModule } from '../resultats/resultats.module';
import { DirectionEtudesController, StatistiquesEnpController } from './direction-etudes.controller';
import { DirectionEtudesService } from './direction-etudes.service';

@Module({
  imports: [DatabaseModule, ResultatsModule],
  controllers: [DirectionEtudesController, StatistiquesEnpController],
  providers: [DirectionEtudesService],
})
export class DirectionEtudesModule {}
