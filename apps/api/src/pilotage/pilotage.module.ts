import { Module } from '@nestjs/common';
import { ResultatsModule } from '../resultats/resultats.module';
import { PilotageController } from './pilotage.controller';
import { PilotageService } from './pilotage.service';

@Module({
  imports: [ResultatsModule],
  controllers: [PilotageController],
  providers: [PilotageService],
})
export class PilotageModule {}
