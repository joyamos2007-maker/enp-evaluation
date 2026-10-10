import * as jwt from 'jsonwebtoken';
import { TokenService } from './token.service';

const SECRET = 'a'.repeat(40);
const REFRESH_SECRET = 'b'.repeat(40);
const config = {
  get: (cle: string) => {
    if (cle === 'JWT_ACCESS_SECRET') return SECRET;
    if (cle === 'JWT_REFRESH_SECRET') return REFRESH_SECRET;
    return undefined;
  },
};

describe('TokenService', () => {
  const service = new TokenService(config as never);

  it('refuse de demarrer sans secret assez long', () => {
    expect(() => new TokenService({ get: () => 'court' } as never)).toThrow();
  });

  it('refuse de demarrer si le secret refresh est identique au secret access', () => {
    expect(
      () =>
        new TokenService({
          get: (cle: string) =>
            cle === 'JWT_ACCESS_SECRET' || cle === 'JWT_REFRESH_SECRET' ? SECRET : undefined,
        } as never),
    ).toThrow('JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent etre differents');
  });

  it('signe puis relit un jeton', () => {
    const jeton = service.signerAcces({ sub: '7', roles: ['etudiant'] });
    expect(service.verifierAcces(jeton)).toEqual({ sub: '7', roles: ['etudiant'] });
  });

  it('signe puis relit un refresh token', () => {
    const jeton = service.signerRefresh({ sub: '7', sid: 'session-42', jti: 'token-42' });
    expect(service.verifierRefresh(jeton)).toEqual({
      sub: '7',
      sid: 'session-42',
      jti: 'token-42',
    });
  });

  it('refuse un jeton modifie', () => {
    const jeton = service.signerAcces({ sub: '7', roles: ['etudiant'] });
    expect(service.verifierAcces(jeton + 'x')).toBeNull();
  });

  it('refuse un jeton signe avec un autre secret', () => {
    const faux = jwt.sign({ sub: '7', roles: ['admin'] }, 'b'.repeat(40));
    expect(service.verifierAcces(faux)).toBeNull();
  });

  it('refuse un jeton expire', () => {
    const vieux = jwt.sign({ sub: '7', roles: [] }, SECRET, { expiresIn: -10 });
    expect(service.verifierAcces(vieux)).toBeNull();
  });
});