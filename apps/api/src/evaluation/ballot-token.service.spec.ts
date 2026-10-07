import * as jwt from 'jsonwebtoken';
import { BallotTokenService } from './ballot-token.service';

const SECRET = 'v'.repeat(40);
const AUTRE = 'a'.repeat(40);
const config = (valeurs: Record<string, string>) => ({ get: (cle: string) => valeurs[cle] });

describe('BallotTokenService', () => {
  const service = new BallotTokenService(
    config({ BALLOT_TOKEN_SECRET: SECRET, JWT_ACCESS_SECRET: AUTRE }) as never,
  );

  it('refuse de demarrer sans secret assez long', () => {
    expect(() => new BallotTokenService(config({ BALLOT_TOKEN_SECRET: 'court' }) as never)).toThrow();
  });

  it('refuse un secret identique a un autre secret', () => {
    expect(
      () =>
        new BallotTokenService(
          config({ BALLOT_TOKEN_SECRET: SECRET, JWT_ACCESS_SECRET: SECRET }) as never,
        ),
    ).toThrow('different');
  });

  it('signe puis relit un jeton', () => {
    const { jeton } = service.signer(3, 7);
    expect(service.verifier(jeton)).toMatchObject({ campagneId: 3, courseId: 7 });
  });

  it('ne contient aucune identite ni heure d emission', () => {
    const { jeton } = service.signer(3, 7);
    const contenu = jwt.decode(jeton) as Record<string, unknown>;
    expect(Object.keys(contenu).sort()).toEqual(['cid', 'exp', 'jti', 'typ', 'ue']);
  });

  it('produit un identifiant different a chaque emission', () => {
    expect(service.signer(3, 7).jeton).not.toBe(service.signer(3, 7).jeton);
  });

  it('expire dans une heure', () => {
    const { jeton, expireDans } = service.signer(3, 7);
    const exp = (jwt.decode(jeton) as { exp: number }).exp;
    const reste = exp - Math.floor(Date.now() / 1000);
    expect(expireDans).toBe(3600);
    expect(reste).toBeGreaterThan(3590);
    expect(reste).toBeLessThanOrEqual(3600);
  });

  it('refuse un jeton signe avec un autre secret', () => {
    const faux = jwt.sign({ typ: 'vote', cid: 1, ue: 1, jti: 'x' }, AUTRE, { expiresIn: 60 });
    expect(service.verifier(faux)).toBeNull();
  });

  it('refuse un jeton modifie', () => {
    const { jeton } = service.signer(3, 7);
    expect(service.verifier(jeton + 'x')).toBeNull();
  });

  it('refuse un jeton expire', () => {
    const vieux = jwt.sign({ typ: 'vote', cid: 1, ue: 1, jti: 'x' }, SECRET, { expiresIn: -10 });
    expect(service.verifier(vieux)).toBeNull();
  });

  it('refuse un jeton qui n est pas un jeton de vote', () => {
    const autre = jwt.sign({ typ: 'acces', cid: 1, ue: 1, jti: 'x' }, SECRET, { expiresIn: 60 });
    expect(service.verifier(autre)).toBeNull();
  });
});