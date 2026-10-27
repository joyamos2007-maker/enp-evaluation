import { BadRequestException } from '@nestjs/common';
import { BallotsController } from './ballots.controller';

describe('BallotsController', () => {
  const ballots = { deposer: jest.fn() };
  const controller = new BallotsController(ballots as never);

  beforeEach(() => jest.resetAllMocks());

  it('depose un bulletin valide et repond ok', async () => {
    ballots.deposer.mockResolvedValue(undefined);
    const res = await controller.deposer({ jeton: 'j', reponses: [{ critereId: 1, valeur: 3 }] });
    expect(res).toEqual({ ok: true });
    expect(ballots.deposer).toHaveBeenCalledTimes(1);
  });

  it('refuse un corps invalide sans appeler le service', async () => {
    await expect(controller.deposer({ jeton: 'j' })).rejects.toBeInstanceOf(BadRequestException);
    expect(ballots.deposer).not.toHaveBeenCalled();
  });

  it('ne recoit que le corps : jamais la requete (ni adresse IP, ni en-tetes)', () => {
    expect(controller.deposer.length).toBe(1);
  });
});