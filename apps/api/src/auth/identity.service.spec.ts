import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Secret, TOTP } from 'otpauth';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  const db = { query: jest.fn() };
  const passwords = { hash: jest.fn() };
  const email = { envoyer: jest.fn(), enfiler: jest.fn() };
  const secret = 'c'.repeat(40);
  const config = {
    get: (key: string) => {
      if (key === 'MFA_CHALLENGE_SECRET') return secret;
      if (key === 'MFA_ENCRYPTION_KEY') return 'a'.repeat(64);
      return undefined;
    },
  };
  const service = new IdentityService(
    db as never,
    passwords as never,
    email as never,
    config as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    passwords.hash.mockResolvedValue('argon-hash');
  });

  it('consomme atomiquement le code d’activation et configure un mot de passe', async () => {
    db.query.mockResolvedValue([{ id: 12 }]);
    await service.activer('ETU-12', '123456', 'un-mot-de-passe-long');
    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE identity.account_tokens');
    expect(params).toEqual([
      'activation',
      expect.any(String),
      'ETU-12',
      'argon-hash',
    ]);
    expect(params[1]).not.toBe('123456');
  });

  it('refuse un code d’activation invalide et compte la tentative', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(
      service.activer('ETU-12', '000000', 'un-mot-de-passe-long'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[1][0]).toContain('attempts = attempts + 1');
  });

  it('met en file le code de réinitialisation à l’adresse du compte trouvé', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 12, email: 'utilisateur@enp.dz' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'token', expires_at: new Date(Date.now() + 1_800_000) },
      ]);
    await service.demanderReinitialisation('ETU-12');
    expect(email.enfiler).toHaveBeenCalledWith(
      'password-reset:token',
      'utilisateur@enp.dz',
      'Réinitialisation du mot de passe ENP',
      expect.stringMatching(/^\s*Votre code de réinitialisation est : \d{6}/),
      expect.any(Date),
    );
  });

  it('ne renvoie pas un nouveau courriel durant le délai anti-abus', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 12, email: 'utilisateur@enp.dz' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await service.demanderReinitialisation('ETU-12');
    expect(email.enfiler).not.toHaveBeenCalled();
  });

  it('chiffre le secret TOTP au repos et l’active après vérification du code', async () => {
    db.query.mockResolvedValueOnce([]);
    const setup = await service.preparerTotp(12);
    const pendingSecret = db.query.mock.calls[0][1][1] as string;
    expect(pendingSecret).not.toContain(setup.secret);

    const totp = new TOTP({
      secret: Secret.fromBase32(setup.secret),
      digits: 6,
      period: 30,
    });
    db.query
      .mockResolvedValueOnce([{ pending_totp_secret: pendingSecret }])
      .mockResolvedValueOnce([]);
    await service.activerTotp(12, totp.generate());
    expect(db.query.mock.calls[2][0]).toContain('totp_enabled = true');
  });

  it('valide une MFA e-mail à usage unique', async () => {
    db.query
      .mockResolvedValueOnce([{ existe: false }])
      .mockResolvedValueOnce([]);
    await service.creerChallengeMfa(12, 'admin@enp.dz', false);
    const code = email.enfiler.mock.calls[0][3].match(/\d{6}/)?.[0];
    expect(code).toBeDefined();
    const hash = createHmac('sha256', secret)
      .update(code as string)
      .digest('hex');
    db.query
      .mockResolvedValueOnce([
        {
          user_id: 12,
          email_code_hash: hash,
          expires_at: new Date(Date.now() + 60_000),
          attempts: 0,
          used_at: null,
          totp_secret: null,
          totp_enabled: false,
        },
      ])
      .mockResolvedValueOnce([{ user_id: 12 }]);
    await expect(
      service.verifierChallengeMfa('challenge', 'email', code as string),
    ).resolves.toBe(12);
  });

  it('bloque les codes MFA après expiration ou cinq échecs', async () => {
    db.query.mockResolvedValue([
      {
        user_id: 12,
        email_code_hash: '0'.repeat(64),
        expires_at: new Date(Date.now() + 60_000),
        attempts: 5,
        used_at: null,
        totp_secret: null,
        totp_enabled: false,
      },
    ]);
    await expect(
      service.verifierChallengeMfa('challenge', 'email', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('limite les demandes répétées de codes MFA', async () => {
    db.query.mockResolvedValueOnce([{ existe: true }]);
    await expect(
      service.creerChallengeMfa(12, 'admin@enp.dz', false),
    ).rejects.toBeInstanceOf(HttpException);
    expect(email.envoyer).not.toHaveBeenCalled();
    expect(email.enfiler).not.toHaveBeenCalled();
  });
});
