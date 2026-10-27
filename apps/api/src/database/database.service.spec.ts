import { DatabaseService, verifierRoleApp } from './database.service';

describe('verifierRoleApp', () => {
  it('accepte un role sans acces a l urne', () => {
    expect(verifierRoleApp({ superuser: false, acces_urne: false })).toBeNull();
  });

  it('refuse un super-utilisateur', () => {
    expect(verifierRoleApp({ superuser: true, acces_urne: false })).toContain('super-utilisateur');
  });

  it('refuse un role qui accede a l urne', () => {
    expect(verifierRoleApp({ superuser: false, acces_urne: true })).toContain('urne');
  });
});

describe('DatabaseService', () => {
  it('refuse de demarrer si DATABASE_URL est identique a une autre base', () => {
    const config = {
      get: (cle: string) => {
        if (cle === 'DATABASE_URL') return 'postgres://main';
        if (cle === 'DATABASE_URL_BALLOT') return 'postgres://main';
        if (cle === 'DATABASE_URL_RESULTS') return 'postgres://results';
        return undefined;
      },
    } as never;

    expect(() => new DatabaseService(config)).toThrow('DATABASE_URL doit etre differente de DATABASE_URL_BALLOT');
  });
});