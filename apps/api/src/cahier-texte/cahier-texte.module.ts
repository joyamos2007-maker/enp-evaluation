import { Module } from '@nestjs/common';
import { CahierTexteController } from './cahier-texte.controller';
import { CahierTexteService } from './cahier-texte.service';
import { ExportsModule } from '../exports/exports.module';

@Module({
  imports: [ExportsModule],
  controllers: [CahierTexteController],
  providers: [CahierTexteService],
})
export class CahierTexteModule {}
