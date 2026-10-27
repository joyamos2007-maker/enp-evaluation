import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { BallotsService } from './ballots.service';

describe('BallotsService', () => {
  const tx = { lire: jest.fn(), executer: jest.fn() };
  const db = { transaction: jest.fn() };
  const tokens = { verifier: jest.fn() };
  const service = new BallotsService(db as never, tokens as never);

  const jeton = {
    campagneId: 3,
    courseId: 7,
    jti: '11111111-1111-4111-8111-111111111111',
    exp: 1893456000,
  };
  const bulletin = {
    jeton: 'j',
    reponses: [
      { critereId: 10, valeur: 4 },
      { critereId: 11, valeur: null },
    ],
    pointsForts: 'Clair',
    pointsAAmeliorer: 'Plus d exercices',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    db.transaction.mockImplementation(async (travail: (t: typeof tx) => Promise<unknown>) =>
      travail(tx),
    );
    tokens.verifier.mockReturnValue(jeton);
    tx.lire.mockResolvedValueOnce([{ version_id: 1 }]).mockResolvedValueOnce([{ id: 10 }, { id: 11 }]);
    tx.executer.mockResolvedValue({ lignes: 1 });
  });

  it('depose un bulletin complet : jeton, bulletin, reponses et deux commentaires', async () => {
    await service.deposer(bulletin);
    expect(tx.executer).toHaveBeenCalledTimes(5);
    const appels = tx.executer.mock.calls;
    expect(appels[0][0]).toContain('ballot.used_tokens');
    expect(appels[0][0]).toContain('ON CONFLICT DO NOTHING');
    expect(appels[0][1]).toEqual([jeton.jti, jeton.exp]);
    expect(appels[1][0]).toContain('ballot.ballots');
    expect(appels[1][1]).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/), 3, 7, 1]);
    expect(appels[2][1][1]).toEqual([10, 11]);
    expect(appels[2][1][2]).toEqual([4, null]);
  });

  it('n ecrit aucun identifiant d etudiant ni aucune heure dans l urne', async () => {
    await service.deposer(bulletin);
    const tout = JSON.stringify(tx.executer.mock.calls);
    expect(tout).not.toMatch(/student|utilisateur|matricule/i);
    expect(tx.executer.mock.calls[1][0]).not.toMatch(/NOW|created|timestamp/i);
  });

  it('refuse (410) un jeton invalide ou expire sans ouvrir de transaction', async () => {
    tokens.verifier.mockReturnValue(null);
    await expect(service.deposer(bulletin)).rejects.toBeInstanceOf(GoneException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('refuse (403) quand la campagne est fermee, sans rien ecrire', async () => {
    tx.lire.mockReset();
    tx.lire.mockResolvedValueOnce([]);
    await expect(service.deposer(bulletin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.executer).not.toHaveBeenCalled();
  });

  it('refuse (400) des reponses incompletes, sans consommer le jeton', async () => {
    const incomplet = { ...bulletin, reponses: [{ critereId: 10, valeur: 4 }] };
    await expect(service.deposer(incomplet)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.executer).not.toHaveBeenCalled();
  });

  it('refuse (400) un critere inconnu, sans consommer le jeton', async () => {
    const inconnu = {
      ...bulletin,
      reponses: [
        { critereId: 10, valeur: 4 },
        { critereId: 999, valeur: 3 },
      ],
    };
    await expect(service.deposer(inconnu)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.executer).not.toHaveBeenCalled();
  });

  it('refuse (409) un jeton deja utilise, sans ecrire de bulletin', async () => {
    tx.executer.mockReset();
    tx.executer.mockResolvedValueOnce({ lignes: 0 });
    await expect(service.deposer(bulletin)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.executer).toHaveBeenCalledTimes(1);
  });

  it('n ecrit pas de commentaire quand il n y en a pas', async () => {
    await service.deposer({ ...bulletin, pointsForts: undefined, pointsAAmeliorer: undefined });
    expect(tx.executer).toHaveBeenCalledTimes(3);
  });

  it('transforme une violation de cle etrangere en erreur 400', async () => {
    tx.executer.mockReset();
    tx.executer
      .mockResolvedValueOnce({ lignes: 1 })
      .mockRejectedValueOnce(Object.assign(new Error('fk'), { code: '23503' }));
    await expect(service.deposer(bulletin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('laisse remonter une erreur inattendue', async () => {
    tx.executer.mockReset();
    tx.executer.mockRejectedValueOnce(Object.assign(new Error('panne'), { code: '57P01' }));
    await expect(service.deposer(bulletin)).rejects.toThrow('panne');
  });
});