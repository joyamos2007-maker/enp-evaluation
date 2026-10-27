import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

export const DUREE_JETON_VOTE_SECONDES = 60 * 60;

export interface ContenuJetonVote {
  campagneId: number;
  courseId: number;
  jti: string;
  exp: number;
}

@Injectable()
export class BallotTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('BALLOT_TOKEN_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'BALLOT_TOKEN_SECRET manquant ou trop court (32 caracteres minimum) dans le fichier .env',
      );
    }
    for (const autre of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ACTIVATION_CODE_SECRET']) {
      if (config.get<string>(autre) === secret) {
        throw new Error('BALLOT_TOKEN_SECRET doit etre different de ' + autre);
      }
    }
    this.secret = secret;
  }

  // Aucune identite dans le jeton : ni sub, ni iat (pas d'heure d'emission precise)
  signer(campagneId: number, courseId: number): { jeton: string; expireDans: number } {
    const exp = Math.floor(Date.now() / 1000) + DUREE_JETON_VOTE_SECONDES;
    const jeton = jwt.sign(
      { typ: 'vote', cid: campagneId, ue: courseId, jti: randomUUID(), exp },
      this.secret,
      { algorithm: 'HS256', noTimestamp: true },
    );
    return { jeton, expireDans: DUREE_JETON_VOTE_SECONDES };
  }

  verifier(jeton: string): ContenuJetonVote | null {
    try {
      const d = jwt.verify(jeton, this.secret, { algorithms: ['HS256'] });
      if (
        typeof d === 'string' ||
        d.typ !== 'vote' ||
        !Number.isInteger(d.cid) ||
        !Number.isInteger(d.ue) ||
        typeof d.jti !== 'string' ||
        typeof d.exp !== 'number'
      ) {
        return null;
      }
      return { campagneId: d.cid, courseId: d.ue, jti: d.jti, exp: d.exp };
    } catch {
      return null;
    }
  }
}