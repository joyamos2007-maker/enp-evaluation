import { verifierRoleApp } from './database.service';

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