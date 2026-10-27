import { verifierRoleUrne } from './ballot-database.service';

const sain = {
  superuser: false,
  lit_registre: false,
  acces_identites: false,
  acces_referentiels: false,
};

describe('verifierRoleUrne', () => {
  it('accepte un role sans droit superflu', () => {
    expect(verifierRoleUrne(sain)).toBeNull();
  });

  it('refuse un super-utilisateur', () => {
    expect(verifierRoleUrne({ ...sain, superuser: true })).toContain('super-utilisateur');
  });

  it('refuse un role qui lit le registre de participation', () => {
    expect(verifierRoleUrne({ ...sain, lit_registre: true })).toContain('registre');
  });

  it('refuse un role qui accede aux identites', () => {
    expect(verifierRoleUrne({ ...sain, acces_identites: true })).toContain('identity');
  });

  it('refuse un role qui accede aux referentiels', () => {
    expect(verifierRoleUrne({ ...sain, acces_referentiels: true })).toContain('ref');
  });
});