import { Module } from '@nestjs/common';
import { ResultatsModule } from '../resultats/resultats.module';
import { ReferentielsController, ScolariteController } from './scolarite.controller';
import { ScolariteService } from './scolarite.service';

@Module({
  imports: [ResultatsModule],
  controllers: [ScolariteController, ReferentielsController],
  providers: [ScolariteService],
})
export class ScolariteModule {}
