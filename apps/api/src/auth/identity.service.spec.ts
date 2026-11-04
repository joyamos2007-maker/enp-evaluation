import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Secret, TOTP } from 'otpauth';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  const db = { query: jest.fn(), transaction: jest.fn() };
  const passwords = { hash: jest.fn(), verify: jest.fn() };
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
    db.transaction.mockImplementation(
      async (work: (query: typeof db.query) => Promise<unknown>) =>
        work(db.query),
    );
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

  it('met en file un courriel d’activation avec le nouveau code', async () => {
    db.query.mockResolvedValueOnce([
      {
        id: 12,
        identifiant: 'SC-12',
        nom: 'DOE',
        prenom: 'Jane',
        email: 'jane@example.test',
        total: 1,
      },
    ]);

    const resultat = await service.genererCodesActivation(null, {
      identifiants: ['SC-12'],
    });

    expect(resultat).toMatchObject({
      courrielsEnfiles: 1,
      comptesSansEmail: [],
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO identity.account_tokens');
    expect(db.query.mock.calls[2][0]).toContain('INSERT INTO system.email_outbox');
    expect(db.query.mock.calls[2][1]).toEqual([
      [12],
      ['jane@example.test'],
      [expect.stringContaining(`Code d’activation : ${resultat.codes[0].code}`)],
      [expect.any(Date)],
    ]);
  });

  it('signale les comptes sans adresse e-mail', async () => {
    db.query.mockResolvedValueOnce([
      {
        id: 13,
        identifiant: 'SC-13',
        nom: 'DOE',
        prenom: 'Jo',
        email: null,
        total: 1,
      },
    ]);

    const resultat = await service.genererCodesActivation(null, {
      identifiants: ['SC-13'],
    });

    expect(resultat.courrielsEnfiles).toBe(0);
    expect(resultat.comptesSansEmail).toEqual(['SC-13']);
    expect(db.query).toHaveBeenCalledTimes(2);
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

  it('stocke uniquement le hachage du jeton de confiance et le vérifie à la connexion', async () => {
    db.query.mockResolvedValueOnce([]);
    const appareil = await service.creerAppareilMfaFiable(12);
    const [insertSql, insertParams] = db.query.mock.calls[0] as [string, unknown[]];

    expect(insertSql).toContain('INSERT INTO identity.mfa_trusted_devices');
    expect(appareil.jeton).toHaveLength(43);
    expect(insertParams[1]).toBe(
      createHmac('sha256', secret).update(appareil.jeton).digest('hex'),
    );
    expect(insertParams[1]).not.toBe(appareil.jeton);
    expect(appareil.expireLe.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);

    db.query.mockResolvedValueOnce([{ user_id: 12 }]);
    await expect(service.appareilMfaFiable(12, appareil.jeton)).resolves.toBe(true);
    expect(db.query.mock.calls[1][0]).toContain('expires_at > NOW()');
  });

  it('refuse un jeton de confiance absent ou trop long sans accès à la base', async () => {
    await expect(service.appareilMfaFiable(12, null)).resolves.toBe(false);
    await expect(service.appareilMfaFiable(12, 'x'.repeat(129))).resolves.toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('change le mot de passe et révoque sessions et appareils de confiance atomiquement', async () => {
    db.query.mockResolvedValueOnce([{ mot_de_passe_hash: 'ancien-hash' }]);
    passwords.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await service.changerMotDePasse(12, 'ancien-mot-de-passe', 'nouveau-mot-de-passe');

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('SET mot_de_passe_hash = $2'),
      [12, 'argon-hash'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE identity.refresh_tokens'),
      [12],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM identity.mfa_trusted_devices'),
      [12],
    );
  });

  it('refuse le changement si le mot de passe actuel est incorrect', async () => {
    db.query.mockResolvedValueOnce([{ mot_de_passe_hash: 'ancien-hash' }]);
    passwords.verify.mockResolvedValueOnce(false);

    await expect(
      service.changerMotDePasse(12, 'incorrect', 'nouveau-mot-de-passe'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('envoie un code à la nouvelle adresse après vérification du mot de passe', async () => {
    db.query
      .mockResolvedValueOnce([
        { email: 'ancien@enp.dz', mot_de_passe_hash: 'argon-hash' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'demande', expires_at: new Date() }]);
    passwords.verify.mockResolvedValue(true);

    await service.demanderChangementEmail(12, ' Nouveau@ENP.DZ ', 'mot-de-passe');

    expect(db.query.mock.calls[0][0]).toContain('identity.users');
    expect(email.enfiler).toHaveBeenCalledWith(
      expect.stringMatching(/^email-change:/),
      'nouveau@enp.dz',
      'Vérification de votre adresse e-mail ENP',
      expect.stringMatching(/Votre code de vérification est : \d{6}/),
      expect.any(Date),
    );
    expect(db.query.mock.calls[3][1]).toEqual([
      12,
      'nouveau@enp.dz',
      expect.any(String),
    ]);
  });

  it('refuse une demande de changement e-mail si le mot de passe est incorrect', async () => {
    db.query.mockResolvedValueOnce([
      { email: 'ancien@enp.dz', mot_de_passe_hash: 'argon-hash' },
    ]);
    passwords.verify.mockResolvedValue(false);

    await expect(
      service.demanderChangementEmail(12, 'nouveau@enp.dz', 'incorrect'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(email.enfiler).not.toHaveBeenCalled();
  });

  it('limite les demandes répétées de changement e-mail', async () => {
    db.query
      .mockResolvedValueOnce([
        { email: 'ancien@enp.dz', mot_de_passe_hash: 'argon-hash' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    passwords.verify.mockResolvedValue(true);

    await expect(
      service.demanderChangementEmail(12, 'nouveau@enp.dz', 'mot-de-passe'),
    ).rejects.toMatchObject({ status: 429 });
    expect(email.enfiler).not.toHaveBeenCalled();
  });

  it('change l’adresse e-mail après confirmation et révoque sessions et appareils fiables', async () => {
    db.query
      .mockResolvedValueOnce([{ pending_email: 'nouveau@enp.dz' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.confirmerChangementEmail(12, '123456');

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE identity.users SET email'),
      [12, 'nouveau@enp.dz'],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE identity.refresh_tokens'),
      [12],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM identity.mfa_trusted_devices'),
      [12],
    );
  });

  it('compte les erreurs de code de changement e-mail et refuse les codes invalides', async () => {
    db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(
      service.confirmerChangementEmail(12, '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.query.mock.calls[1][0]).toContain('attempts = attempts + 1');
  });
});
