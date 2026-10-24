import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomInt,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { DatabaseService } from '../database/database.service';
import { PasswordService } from './password.service';
import { EmailService } from './email.service';

const TOKEN_ACTIVATION = 'activation';
const TOKEN_REINITIALISATION = 'password_reset';

@Injectable()
export class IdentityService {
  private readonly challengeSecret: string;
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly db: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    const secret =
      config.get<string>('MFA_CHALLENGE_SECRET') ??
      config.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'MFA_CHALLENGE_SECRET doit contenir au moins 32 caracteres',
      );
    }
    this.challengeSecret = secret;
    const encryptionKey = config.get<string>('MFA_ENCRYPTION_KEY');
    if (!encryptionKey || !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      throw new Error(
        'MFA_ENCRYPTION_KEY doit etre une cle hexadecimale de 32 octets',
      );
    }
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  async genererCodesActivation(
    campusId: number | null,
    filtre: { tousSansMotDePasse?: boolean; identifiants?: string[] },
  ) {
    if (
      filtre.tousSansMotDePasse !== true &&
      filtre.identifiants &&
      (filtre.identifiants.length === 0 ||
        filtre.identifiants.length > 500 ||
        filtre.identifiants.some(
          (identifiant) =>
            typeof identifiant !== 'string' || identifiant.length > 255,
        ))
    ) {
      throw new BadRequestException(
        'La liste d’identifiants est invalide ou trop volumineuse',
      );
    }
    const comptes = await this.db.query<{
      id: number;
      identifiant: string;
      nom: string;
      prenom: string;
      total: number;
    }>(
      `SELECT comptes.*, count(*) OVER () AS total
       FROM (
         SELECT DISTINCT u.id, COALESCE(u.matricule, u.email) AS identifiant,
               u.nom, u.prenom
         FROM identity.users u
         LEFT JOIN identity.user_roles r ON r.user_id = u.id
         WHERE u.actif AND u.mot_de_passe_hash IS NULL
           AND ($1::int IS NULL OR r.campus_id = $1 OR r.department_id IN (
             SELECT d.id FROM ref.department d WHERE d.campus_id = $1
           ))
           AND ($2::boolean OR LOWER(COALESCE(u.matricule, u.email)) = ANY($3::text[]))
       ) comptes
       ORDER BY comptes.id
       LIMIT 500`,
      [
        campusId,
        filtre.tousSansMotDePasse === true,
        (filtre.identifiants ?? []).map((identifiant) =>
          identifiant.trim().toLowerCase(),
        ),
      ],
    );

    const codes: {
      identifiant: string;
      nom: string;
      prenom: string;
      code: string;
      expireLe: string;
    }[] = [];
    const tokens: { userId: number; hash: string }[] = [];
    for (const compte of comptes) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      tokens.push({ userId: compte.id, hash: this.hashChallenge(code) });
      codes.push({
        identifiant: compte.identifiant,
        nom: compte.nom,
        prenom: compte.prenom,
        code,
        expireLe: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    if (tokens.length > 0) {
      await this.db.query(
        `INSERT INTO identity.account_tokens (user_id, type, token_hash, expires_at)
         SELECT batch.user_id, $2, batch.token_hash, NOW() + INTERVAL '14 days'
         FROM unnest($1::int[], $3::text[]) AS batch(user_id, token_hash)
         ON CONFLICT (user_id, type) WHERE used_at IS NULL
         DO UPDATE SET token_hash = EXCLUDED.token_hash,
                       expires_at = EXCLUDED.expires_at,
                       attempts = 0,
                       created_at = NOW()`,
        [
          tokens.map((token) => token.userId),
          TOKEN_ACTIVATION,
          tokens.map((token) => token.hash),
        ],
      );
    }
    const emis = new Set(
      codes.map((element) => element.identifiant.toLowerCase()),
    );
    const ignores = (filtre.identifiants ?? [])
      .map((identifiant) => identifiant.trim())
      .filter(
        (identifiant) => identifiant && !emis.has(identifiant.toLowerCase()),
      )
      .map((identifiant) => ({
        identifiant,
        raison: 'Compte introuvable, déjà activé ou hors périmètre',
      }));
    return {
      codes,
      ignores,
      restants: Math.max(0, Number(comptes[0]?.total ?? 0) - codes.length),
    };
  }

  async activer(
    identifiant: string,
    code: string,
    motDePasse: string,
  ): Promise<void> {
    this.validerMotDePasse(motDePasse);
    const passwordHash = await this.passwords.hash(motDePasse);
    const rows = await this.db.query<{ id: number }>(
      `WITH token AS (
         UPDATE identity.account_tokens t
         SET used_at = NOW()
         FROM identity.users u
         WHERE t.user_id = u.id
           AND t.type = $1
           AND t.token_hash = $2
           AND t.used_at IS NULL
           AND t.expires_at > NOW()
           AND u.mot_de_passe_hash IS NULL
           AND (u.matricule = $3 OR LOWER(u.email) = LOWER($3))
         RETURNING t.user_id
       )
       UPDATE identity.users u
       SET mot_de_passe_hash = $4
       FROM token
       WHERE u.id = token.user_id
       RETURNING u.id`,
      [
        TOKEN_ACTIVATION,
        this.hashChallenge(code),
        identifiant.trim(),
        passwordHash,
      ],
    );
    if (rows.length === 0) {
      await this.comptabiliserEchec(TOKEN_ACTIVATION, identifiant);
      throw new BadRequestException(
        'Identifiant ou code d’activation invalide ou expiré',
      );
    }
  }

  async demanderReinitialisation(identifiant: string): Promise<void> {
    const rows = await this.db.query<{ id: number; email: string }>(
      `SELECT id, email FROM identity.users
       WHERE actif AND email IS NOT NULL AND mot_de_passe_hash IS NOT NULL
         AND (matricule = $1 OR LOWER(email) = LOWER($1))
       LIMIT 1`,
      [identifiant.trim()],
    );
    if (!rows[0]) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.db.query(
      `INSERT INTO identity.account_tokens (user_id, type, token_hash, expires_at)
       SELECT $1, $2, $3, NOW() + INTERVAL '30 minutes'
       WHERE NOT EXISTS (
         SELECT 1 FROM identity.account_tokens
         WHERE user_id = $1 AND type = $2 AND used_at IS NULL
           AND created_at > NOW() - INTERVAL '2 minutes'
       )
       ON CONFLICT (user_id, type) WHERE used_at IS NULL
       DO UPDATE SET token_hash = EXCLUDED.token_hash,
                     expires_at = EXCLUDED.expires_at,
                     attempts = 0,
                     created_at = NOW()`,
      [rows[0].id, TOKEN_REINITIALISATION, this.hashChallenge(code)],
    );
    const created = await this.db.query<{ id: string; expires_at: Date }>(
      `SELECT id, expires_at FROM identity.account_tokens
       WHERE user_id = $1 AND type = $2 AND used_at IS NULL
         AND token_hash = $3 AND created_at > NOW() - INTERVAL '1 second'`,
      [rows[0].id, TOKEN_REINITIALISATION, this.hashChallenge(code)],
    );
    if (created.length === 0) return;

    await this.email.enfiler(
      `password-reset:${created[0].id}`,
      rows[0].email,
      'Réinitialisation du mot de passe ENP',
      `Votre code de réinitialisation est : ${code}. Il expire dans 30 minutes.`,
      created[0].expires_at,
    );
  }

  async reinitialiser(
    identifiant: string,
    code: string,
    motDePasse: string,
  ): Promise<void> {
    this.validerMotDePasse(motDePasse);
    const passwordHash = await this.passwords.hash(motDePasse);
    const rows = await this.db.query<{ user_id: number }>(
      `WITH token AS (
         UPDATE identity.account_tokens t
         SET used_at = NOW()
         FROM identity.users u
         WHERE t.user_id = u.id
           AND t.type = $1
           AND t.token_hash = $2
           AND t.used_at IS NULL
           AND t.expires_at > NOW()
           AND u.actif
           AND (u.matricule = $3 OR LOWER(u.email) = LOWER($3))
         RETURNING t.user_id
       )
       UPDATE identity.users u
       SET mot_de_passe_hash = $4,
           tentatives_echouees = 0,
           verrouille_jusqua = NULL
       FROM token
       WHERE u.id = token.user_id
       RETURNING u.id AS user_id`,
      [
        TOKEN_REINITIALISATION,
        this.hashChallenge(code),
        identifiant.trim(),
        passwordHash,
      ],
    );
    if (rows.length === 0) {
      await this.comptabiliserEchec(TOKEN_REINITIALISATION, identifiant);
      throw new BadRequestException(
        'Identifiant ou code de réinitialisation invalide ou expiré',
      );
    }
    await this.db.query(
      'UPDATE identity.refresh_tokens SET revoque_le = NOW() WHERE user_id = $1 AND revoque_le IS NULL',
      [rows[0].user_id],
    );
  }

  async creerChallengeMfa(
    userId: number,
    email: string,
    totpDisponible: boolean,
  ) {
    const recents = await this.db.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM identity.mfa_challenges
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
       ) AS existe`,
      [userId],
    );
    if (recents[0]?.existe) {
      throw new HttpException(
        'Patientez avant de demander un nouveau code MFA',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challengeId = randomUUID();
    await this.db.query(
      `INSERT INTO identity.mfa_challenges (id, user_id, email_code_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
      [challengeId, userId, this.hashChallenge(code)],
    );
    await this.email.enfiler(
      `mfa:${challengeId}`,
      email,
      'Code de connexion ENP',
      `Votre code de sécurité est : ${code}. Il expire dans 5 minutes.`,
      new Date(Date.now() + 5 * 60_000),
      2,
    );
    return {
      mfaRequired: true as const,
      challengeId,
      methods: totpDisponible ? ['email', 'totp'] : ['email'],
    };
  }

  async verifierChallengeMfa(
    challengeId: string,
    method: string,
    code: string,
  ) {
    if (!['email', 'totp'].includes(method) || !/^\d{6}$/.test(code)) {
      throw new UnauthorizedException('Code MFA invalide');
    }
    const stored = await this.db.query<{
      user_id: number;
      email_code_hash: string;
      expires_at: Date;
      attempts: number;
      used_at: Date | null;
      totp_secret: string | null;
      totp_enabled: boolean;
    }>(
      `SELECT c.user_id, c.email_code_hash, c.expires_at, c.attempts, c.used_at,
              m.totp_secret, COALESCE(m.totp_enabled, false) AS totp_enabled
       FROM identity.mfa_challenges c
       LEFT JOIN identity.user_mfa m ON m.user_id = c.user_id
       WHERE c.id = $1`,
      [challengeId],
    );
    const challenge = stored[0];
    if (
      !challenge ||
      challenge.used_at ||
      challenge.expires_at <= new Date() ||
      challenge.attempts >= 5
    ) {
      throw new UnauthorizedException('Code MFA invalide ou expiré');
    }

    const valid =
      method === 'email'
        ? this.comparerHmac(code, challenge.email_code_hash)
        : await this.verifierTotp(
            challenge.totp_secret
              ? this.dechiffrer(challenge.totp_secret)
              : null,
            challenge.totp_enabled,
            code,
          );

    if (!valid) {
      await this.db.query(
        'UPDATE identity.mfa_challenges SET attempts = attempts + 1 WHERE id = $1 AND used_at IS NULL',
        [challengeId],
      );
      throw new UnauthorizedException('Code MFA invalide');
    }
    const consumed = await this.db.query<{ user_id: number }>(
      `UPDATE identity.mfa_challenges
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL AND expires_at > NOW() AND attempts < 5
       RETURNING user_id`,
      [challengeId],
    );
    if (!consumed[0])
      throw new UnauthorizedException('Code MFA invalide ou expiré');
    return consumed[0].user_id;
  }

  async preparerTotp(userId: number) {
    const secret = new (await import('otpauth')).Secret({ size: 20 });
    const totp = new (await import('otpauth')).TOTP({
      issuer: 'ENP',
      label: `Compte ${userId}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    await this.db.query(
      `INSERT INTO identity.user_mfa (user_id, pending_totp_secret)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET pending_totp_secret = EXCLUDED.pending_totp_secret`,
      [userId, this.chiffrer(secret.base32)],
    );
    return { secret: secret.base32, otpauthUrl: totp.toString() };
  }

  async totpDisponible(userId: number): Promise<boolean> {
    const rows = await this.db.query<{ totp_enabled: boolean }>(
      'SELECT totp_enabled FROM identity.user_mfa WHERE user_id = $1',
      [userId],
    );
    return rows[0]?.totp_enabled ?? false;
  }

  async statutMfa(userId: number) {
    return { totpActive: await this.totpDisponible(userId) };
  }

  async activerTotp(userId: number, code: string): Promise<void> {
    const rows = await this.db.query<{ pending_totp_secret: string | null }>(
      'SELECT pending_totp_secret FROM identity.user_mfa WHERE user_id = $1',
      [userId],
    );
    const secret = rows[0]?.pending_totp_secret
      ? this.dechiffrer(rows[0].pending_totp_secret)
      : null;
    const { TOTP, Secret } = await import('otpauth');
    const totp = secret
      ? new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 })
      : null;
    if (!totp || totp.validate({ token: code, window: 1 }) === null) {
      throw new BadRequestException('Code TOTP invalide');
    }
    await this.db.query(
      `UPDATE identity.user_mfa
       SET totp_secret = pending_totp_secret, pending_totp_secret = NULL, totp_enabled = true
       WHERE user_id = $1`,
      [userId],
    );
  }

  async desactiverTotp(userId: number, code: string): Promise<void> {
    const rows = await this.db.query<{
      totp_secret: string | null;
      totp_enabled: boolean;
    }>(
      'SELECT totp_secret, totp_enabled FROM identity.user_mfa WHERE user_id = $1',
      [userId],
    );
    const encryptedSecret = rows[0]?.totp_secret ?? null;
    if (
      !(await this.verifierTotp(
        encryptedSecret ? this.dechiffrer(encryptedSecret) : null,
        rows[0]?.totp_enabled ?? false,
        code,
      ))
    ) {
      throw new BadRequestException('Code TOTP invalide');
    }
    await this.db.query(
      'UPDATE identity.user_mfa SET totp_secret = NULL, pending_totp_secret = NULL, totp_enabled = false WHERE user_id = $1',
      [userId],
    );
  }

  private async verifierTotp(
    secret: string | null,
    enabled: boolean,
    code: string,
  ): Promise<boolean> {
    if (!secret || !enabled) return false;
    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    return totp.validate({ token: code, window: 1 }) !== null;
  }

  private hashChallenge(code: string): string {
    return createHmac('sha256', this.challengeSecret)
      .update(code)
      .digest('hex');
  }

  private async comptabiliserEchec(
    type: string,
    identifiant: string,
  ): Promise<void> {
    await this.db.query(
      `UPDATE identity.account_tokens t
       SET attempts = attempts + 1,
           used_at = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE used_at END
       FROM identity.users u
       WHERE t.user_id = u.id AND t.type = $1
         AND t.used_at IS NULL AND t.expires_at > NOW() AND t.attempts < 5
         AND (u.matricule = $2 OR LOWER(u.email) = LOWER($2))`,
      [type, identifiant.trim()],
    );
  }

  private comparerHmac(code: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashChallenge(code), 'hex');
    const attendu = Buffer.from(storedHash, 'hex');
    return actual.length === attendu.length && timingSafeEqual(actual, attendu);
  }

  private chiffrer(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private dechiffrer(value: string): string {
    const [iv, tag, encrypted] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !encrypted)
      throw new Error('Secret MFA chiffre invalide');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private validerMotDePasse(motDePasse: string): void {
    if (motDePasse.length < 12 || motDePasse.length > 200) {
      throw new BadRequestException(
        'Le mot de passe doit contenir entre 12 et 200 caractères',
      );
    }
  }
}
