import { Module } from '@nestjs/common';
import { ResultatsModule } from '../resultats/resultats.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [ResultatsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}