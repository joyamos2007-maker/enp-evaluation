import { AuditService } from './audit.service';

describe('AuditService', () => {
  const db = { query: jest.fn() };
  const service = new AuditService(db as never);

  beforeEach(() => jest.resetAllMocks());

  it('limite la consultation Scolarité aux évènements liés à son campus', async () => {
    db.query.mockResolvedValue([]);

    await expect(service.lister(100, 7)).resolves.toEqual([]);

    expect(db.query.mock.calls[0][0]).toContain('d.campus_id = $2');
    expect(db.query.mock.calls[0][0]).toContain('campaign_id IS NOT NULL');
    expect(db.query.mock.calls[0][1]).toEqual([100, 7]);
  });

  it('retourne le journal complet à l’administration technique', async () => {
    db.query.mockResolvedValue([]);

    await service.lister(200, null);

    expect(db.query.mock.calls[0][1]).toEqual([200, null]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE $2::int IS NULL OR');
  });
});
