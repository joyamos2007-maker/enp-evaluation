import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  async check() {
    const dbOk = await this.db.ping();
    if (!dbOk) {
      throw new ServiceUnavailableException({ statut: 'erreur', base: 'indisponible' });
    }
    return { statut: 'ok', base: 'ok' };
  }
}