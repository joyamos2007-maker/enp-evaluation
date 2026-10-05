import * as jwt from 'jsonwebtoken';
import { TokenService } from './token.service';

const SECRET = 'a'.repeat(40);
const config = { get: (cle: string) => (cle === 'JWT_ACCESS_SECRET' ? SECRET : undefined) };

describe('TokenService', () => {
  const service = new TokenService(config as never);

  it('refuse de demarrer sans secret assez long', () => {
    expect(() => new TokenService({ get: () => 'court' } as never)).toThrow();
  });

  it('signe puis relit un jeton', () => {
    const jeton = service.signerAcces({ sub: '7', roles: ['etudiant'] });
    expect(service.verifierAcces(jeton)).toEqual({ sub: '7', roles: ['etudiant'] });
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