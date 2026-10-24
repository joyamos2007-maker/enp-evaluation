import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';
import { ComptesController } from './comptes.controller';


@Module({
  imports: [DatabaseModule],
  controllers: [ComptesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}