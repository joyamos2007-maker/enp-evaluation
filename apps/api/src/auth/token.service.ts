import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface ContenuJeton {
  sub: string;
  roles: string[];
}

export const DUREE_JETON_SECONDES = 15 * 60;

@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_ACCESS_SECRET manquant ou trop court (32 caracteres minimum) dans le fichier .env',
      );
    }
    this.secret = secret;
  }

  signerAcces(contenu: ContenuJeton): string {
    return jwt.sign(contenu, this.secret, {
      algorithm: 'HS256',
      expiresIn: DUREE_JETON_SECONDES,
    });
  }

  verifierAcces(jeton: string): ContenuJeton | null {
    try {
      const decode = jwt.verify(jeton, this.secret, { algorithms: ['HS256'] });
      if (typeof decode === 'string') return null;
      if (typeof decode.sub !== 'string' || !Array.isArray(decode.roles)) return null;
      return {
        sub: decode.sub,
        roles: decode.roles.filter((r: unknown): r is string => typeof r === 'string'),
      };
    } catch {
      return null;
    }
  }
}