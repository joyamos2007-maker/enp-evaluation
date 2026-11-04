import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { DatabaseModule } from '../database/database.module';
import { AcademicImportsService } from './academic-imports.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ImportsController],
  providers: [ImportsService, AcademicImportsService],
  exports: [ImportsService, AcademicImportsService],
})
export class ImportsModule {}