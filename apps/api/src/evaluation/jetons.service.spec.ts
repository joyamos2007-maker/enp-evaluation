import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JetonsService } from './jetons.service';

describe('JetonsService', () => {
  const db = { query: jest.fn() };
  const tokens = { signer: jest.fn() };
  const service = new JetonsService(db as never, tokens as never);

  beforeEach(() => {
    jest.resetAllMocks();
    tokens.signer.mockReturnValue({ jeton: 'jeton-secret-de-vote', expireDans: 3600 });
  });

  it('emet un jeton quand la participation est enregistree', async () => {
    db.query.mockResolvedValueOnce([{ ok: 1 }]);
    const res = await service.emettre(42, 7, 3);
    expect(res).toEqual({ jeton: 'jeton-secret-de-vote', expireDans: 3600 });
    expect(tokens.signer).toHaveBeenCalledWith(3, 7);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([42, 7, 3]);
  });

  it('ne met jamais le jeton dans la requete SQL', async () => {
    db.query.mockResolvedValueOnce([{ ok: 1 }]);
    await service.emettre(42, 7, 3);
    expect(JSON.stringify(db.query.mock.calls)).not.toContain('jeton-secret-de-vote');
  });

  it('verifie inscription, campagne ouverte et periode dans la meme requete', async () => {
    db.query.mockResolvedValueOnce([{ ok: 1 }]);
    await service.emettre(42, 7, 3);
    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain('ref.enrollment');
    expect(sql).not.toContain('ref.class_delegate');
    expect(sql).toContain('e.course_id = co.id AND e.student_id = $1');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(sql).toContain("c.statut = 'ouverte'");
    expect(sql).toContain('c.debut <= NOW()');
    expect(sql).toContain('c.fin > NOW()');
  });

  it('ne permet pas à un délégué non inscrit d’obtenir un jeton', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.emettre(43, 7, 3)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.query.mock.calls[0][0]).toContain('ref.enrollment');
    expect(db.query.mock.calls[0][0]).not.toContain('ref.class_delegate');
    expect(db.query.mock.calls[0][1]).toEqual([43, 7, 3]);
  });

  it('refuse (409) un etudiant qui a deja participe', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ x: 1 }]);
    await expect(service.emettre(42, 7, 3)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse (403) quand l evaluation est indisponible', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.emettre(42, 7, 3)).rejects.toBeInstanceOf(ForbiddenException);
  });
});