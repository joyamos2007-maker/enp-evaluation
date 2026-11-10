import { AuditService } from './audit.service';

describe('AuditService', () => {
  const db = { query: jest.fn() };
  const service = new AuditService(db as never);

  beforeEach(() => jest.resetAllMocks());

  it('enregistre le matricule de l’acteur avec son identifiant interne', async () => {
    db.query.mockResolvedValue([]);

    await service.enregistrer({
      userId: 7,
      action: 'test',
    });

    expect(db.query.mock.calls[0][0]).toContain('user_matricule');
    expect(db.query.mock.calls[0][0]).toContain(
      'SELECT matricule FROM identity.users WHERE id = $1',
    );
    expect(db.query.mock.calls[0][1]).toEqual([
      7,
      'test',
      null,
      null,
      null,
      null,
    ]);
  });

  it('limite la consultation Scolarité aux évènements liés à son campus', async () => {
    db.query.mockResolvedValue([]);

    await expect(service.lister(100, 7)).resolves.toEqual([]);

    expect(db.query.mock.calls[0][0]).toContain('d.campus_id = $2');
    expect(db.query.mock.calls[0][0]).toContain('campaign_id IS NOT NULL');
    expect(db.query.mock.calls[0][1]).toEqual([100, 7]);
  });

  it('retourne le journal complet à l’administration technique', async () => {
    db.query.mockResolvedValue([
      {
        id: 1,
        cree_le: '2026-01-01T00:00:00Z',
        user_id: 7,
        user_matricule: 'ETU001',
        action: 'test',
        campaign_id: null,
        course_id: null,
        campus_id: null,
        objet: null,
        detail: null,
      },
    ]);

    await expect(service.lister(200, null)).resolves.toMatchObject([
      { userId: 7, userMatricule: 'ETU001' },
    ]);

    expect(db.query.mock.calls[0][1]).toEqual([200, null]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE $2::int IS NULL OR');
  });
});
