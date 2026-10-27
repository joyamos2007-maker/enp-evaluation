import { verifierRoleResultats } from './results-database.service';

const sain = {
  superuser: false,
  lit_registre: false,
  acces_identites: false,
  acces_referentiels: false,
  ecrit_urne: false,
};

describe('verifierRoleResultats', () => {
  it('accepte un role en lecture seule sans acces aux identites', () => {
    expect(verifierRoleResultats(sain)).toBeNull();
  });

  it('refuse un super-utilisateur', () => {
    expect(verifierRoleResultats({ ...sain, superuser: true })).toContain('super-utilisateur');
  });

  it('refuse un role qui lit le registre de participation', () => {
    expect(verifierRoleResultats({ ...sain, lit_registre: true })).toContain('registre');
  });

  it('refuse un role qui accede aux identites ou aux referentiels', () => {
    expect(verifierRoleResultats({ ...sain, acces_identites: true })).toContain('identity');
    expect(verifierRoleResultats({ ...sain, acces_referentiels: true })).toContain('ref');
  });

  it('refuse un role qui peut ecrire dans l urne', () => {
    expect(verifierRoleResultats({ ...sain, ecrit_urne: true })).toContain('ecrire');
  });
});