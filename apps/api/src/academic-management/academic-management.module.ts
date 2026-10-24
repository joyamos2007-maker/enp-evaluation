import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  AcademicManagementController,
  AnnualArchivesController,
} from './academic-management.controller';
import { AcademicManagementService } from './academic-management.service';
import { AnnualArchivesService } from './annual-archives.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AcademicManagementController, AnnualArchivesController],
  providers: [AcademicManagementService, AnnualArchivesService],
  exports: [AcademicManagementService, AnnualArchivesService],
})
export class AcademicManagementModule {}
