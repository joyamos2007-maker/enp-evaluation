import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { DatabaseService } from '../database/database.service';
import { BallotDatabaseService } from '../evaluation/ballot-database.service';
import { ResultsDatabaseService } from '../resultats/results-database.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly ballotDb: BallotDatabaseService,
    private readonly resultsDb: ResultsDatabaseService,
  ) {}

  @Public()
  @Get()
  async check() {
    const [application, urne, resultats] = await Promise.all([
      this.db.ping(),
      this.ballotDb.ping(),
      this.resultsDb.ping(),
    ]);
    const bases = {
      application: application ? 'ok' : 'indisponible',
      urne: urne ? 'ok' : 'indisponible',
      resultats: resultats ? 'ok' : 'indisponible',
    };

    if (!application || !urne || !resultats) {
      throw new ServiceUnavailableException({ statut: 'erreur', bases });
    }
    return { statut: 'ok', bases };
  }
}