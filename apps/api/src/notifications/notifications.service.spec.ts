import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const db = { query: jest.fn() };
  const email = { envoyer: jest.fn() };
  const service = new NotificationsService(db as never, email as never);

  beforeEach(() => jest.resetAllMocks());

  it('ne retourne que les notifications du compte demandé', async () => {
    db.query.mockResolvedValueOnce([
      {
        id: 3,
        title: 'Rappel',
        message: 'Échéance prochaine',
        link: '/evaluations',
        cree_le: '2026-10-08T10:00:00Z',
        lu_le: null,
      },
    ]);
    await expect(service.lister(12)).resolves.toEqual([
      {
        id: 3,
        title: 'Rappel',
        message: 'Échéance prochaine',
        link: '/evaluations',
        creeLe: '2026-10-08T10:00:00Z',
        luLe: undefined,
      },
    ]);
    expect(db.query.mock.calls[0][0]).toContain('WHERE user_id = $1');
    expect(db.query.mock.calls[0][1]).toEqual([12]);
  });

  it('marque une notification uniquement pour son propriétaire', async () => {
    await service.marquerLue(12, 3);
    expect(db.query.mock.calls[0][0]).toContain(
      'WHERE id = $1 AND user_id = $2',
    );
    expect(db.query.mock.calls[0][1]).toEqual([3, 12]);
  });
});
