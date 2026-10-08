import { Module } from '@nestjs/common';
import { ResultatsController } from './resultats.controller';
import { ResultatsService } from './resultats.service';
import { ResultsDatabaseService } from './results-database.service';

@Module({
  controllers: [ResultatsController],
  providers: [ResultatsService, ResultsDatabaseService],
  exports: [ResultsDatabaseService],
})
export class ResultatsModule {}