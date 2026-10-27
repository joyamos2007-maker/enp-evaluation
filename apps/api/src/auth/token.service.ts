import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface ContenuJeton {
  sub: string;
  roles: string[];
  activeRole: string;
}

export interface ContenuJetonRefresh {
  sub: string;
  sid: string;
  jti: string;
}

export const DUREE_JETON_SECONDES = 15 * 60;
export const DUREE_JETON_REFRESH_SECONDES = 8 * 60 * 60;

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly refreshSecret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_ACCESS_SECRET manquant ou trop court (32 caracteres minimum) dans le fichier .env',
      );
    }
    const refresh = config.get<string>('JWT_REFRESH_SECRET');
    if (!refresh || refresh.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET manquant ou trop court (32 caracteres minimum) dans le fichier .env',
      );
    }
    if (secret === refresh) {
      throw new Error('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent etre differents');
    }
    this.secret = secret;
    this.refreshSecret = refresh;
  }

  signerAcces(contenu: ContenuJeton): string {
    return jwt.sign(contenu, this.secret, {
      algorithm: 'HS256',
      expiresIn: DUREE_JETON_SECONDES,
    });
  }

  signerRefresh(contenu: ContenuJetonRefresh): string {
    return jwt.sign(contenu, this.refreshSecret, {
      algorithm: 'HS256',
      expiresIn: DUREE_JETON_REFRESH_SECONDES,
    });
  }

  verifierAcces(jeton: string): ContenuJeton | null {
    try {
      const decode = jwt.verify(jeton, this.secret, { algorithms: ['HS256'] });
      if (typeof decode === 'string') return null;
      if (typeof decode.sub !== 'string' || !Array.isArray(decode.roles)) return null;
      if (typeof decode.activeRole !== 'string') return null;
      return {
        sub: decode.sub,
        roles: decode.roles.filter((r: unknown): r is string => typeof r === 'string'),
        activeRole: decode.activeRole,
      };
    } catch {
      return null;
    }
  }

  verifierRefresh(jeton: string): ContenuJetonRefresh | null {
    try {
      const decode = jwt.verify(jeton, this.refreshSecret, { algorithms: ['HS256'] });
      if (typeof decode === 'string') return null;
      if (
        typeof decode.sub !== 'string' ||
        typeof decode.sid !== 'string' ||
        typeof decode.jti !== 'string'
      ) {
        return null;
      }
      return {
        sub: decode.sub,
        sid: decode.sid,
        jti: decode.jti,
      };
    } catch {
      return null;
    }
  }
}