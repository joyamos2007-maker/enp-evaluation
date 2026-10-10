import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // 👈 Indispensable pour que d'autres modules le voient
})
export class DatabaseModule {}