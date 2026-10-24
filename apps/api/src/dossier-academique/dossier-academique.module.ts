import { Module } from '@nestjs/common';
import { DossierAcademiqueController } from './dossier-academique.controller';
import { DossierAcademiqueService } from './dossier-academique.service';
import { ExportsModule } from '../exports/exports.module';

@Module({
  imports: [ExportsModule],
  controllers: [DossierAcademiqueController],
  providers: [DossierAcademiqueService],
})
export class DossierAcademiqueModule {}
