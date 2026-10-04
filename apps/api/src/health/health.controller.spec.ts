import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';

describe('HealthController', () => {
  let controller: HealthController;
  const db = { ping: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseService, useValue: db }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('repond ok quand la base repond', async () => {
    db.ping.mockResolvedValue(true);
    await expect(controller.check()).resolves.toEqual({ statut: 'ok', base: 'ok' });
  });

  it('renvoie une erreur 503 quand la base ne repond pas', async () => {
    db.ping.mockResolvedValue(false);
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});