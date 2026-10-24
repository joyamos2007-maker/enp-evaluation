import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CampusScopeService } from './campus-scope.service';

@Global()
@Module({
  providers: [DatabaseService, CampusScopeService],
  exports: [DatabaseService, CampusScopeService],
})
export class DatabaseModule {}