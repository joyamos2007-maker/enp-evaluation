import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';
import { BallotDatabaseService } from '../evaluation/ballot-database.service';
import { ResultsDatabaseService } from '../resultats/results-database.service';

describe('HealthController', () => {
  let controller: HealthController;
  const db = { ping: jest.fn() };
  const ballotDb = { ping: jest.fn() };
  const resultsDb = { ping: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DatabaseService, useValue: db },
        { provide: BallotDatabaseService, useValue: ballotDb },
        { provide: ResultsDatabaseService, useValue: resultsDb },
      ],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('repond ok quand les trois connexions repondent', async () => {
    db.ping.mockResolvedValue(true);
    ballotDb.ping.mockResolvedValue(true);
    resultsDb.ping.mockResolvedValue(true);
    await expect(controller.check()).resolves.toEqual({
      statut: 'ok',
      bases: { application: 'ok', urne: 'ok', resultats: 'ok' },
    });
  });

  it('renvoie une erreur 503 si au moins une connexion ne repond pas', async () => {
    db.ping.mockResolvedValue(true);
    ballotDb.ping.mockResolvedValue(false);
    resultsDb.ping.mockResolvedValue(true);
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});