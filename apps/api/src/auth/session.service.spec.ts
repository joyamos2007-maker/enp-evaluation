import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const db = { query: jest.fn() };
  const service = new SessionService(db as never);
  const date = new Date('2030-01-01T00:00:00Z');

  beforeEach(() => db.query.mockReset());

  it('ne stocke que l empreinte du jeton', async () => {
    db.query.mockResolvedValue([{ inactif_apres: date }]);
    const res = await service.creer(5, 'etudiant');
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(res.jeton.length).toBeGreaterThan(40);
    expect(params).not.toContain(res.jeton);
    expect(params[2]).toMatch(/^[0-9a-f]{64}$/);
    expect(res.expireLe).toBe(date);
  });

  it('renouvelle un jeton valide et en emet un nouveau', async () => {
    db.query.mockResolvedValue([{ user_id: 5, inactif_apres: date, active_role: 'etudiant' }]);
    const res = await service.renouveler('ancien-jeton');
    expect(res.userId).toBe(5);
    expect(res.activeRole).toBe('etudiant');
    expect(res.jeton).not.toBe('ancien-jeton');
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('refuse un jeton inconnu sans rien revoquer', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.renouveler('inconnu')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('revoque toute la famille quand un jeton deja remplace revient', async () => {
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ remplace_le: new Date(), revoque_le: null }])
      .mockResolvedValueOnce([]);
    await expect(service.renouveler('ancien')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(db.query.mock.calls[2][0]).toContain('revoque_le = NOW()');
  });

  it('revoque la famille du jeton a la deconnexion', async () => {
    db.query.mockResolvedValue([]);
    await service.revoquer('jeton');
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain('revoque_le = NOW()');
  });
});