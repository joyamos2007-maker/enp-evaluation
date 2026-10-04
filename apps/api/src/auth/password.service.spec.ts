import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('produit une empreinte argon2id differente du mot de passe', async () => {
    const h = await service.hash('Test-Etudiant-2026');
    expect(h).not.toContain('Test-Etudiant-2026');
    expect(h.startsWith('$argon2id$')).toBe(true);
  });

  it('accepte le bon mot de passe et refuse un mauvais', async () => {
    const h = await service.hash('Test-Etudiant-2026');
    await expect(service.verify(h, 'Test-Etudiant-2026')).resolves.toBe(true);
    await expect(service.verify(h, 'autre-mot-de-passe')).resolves.toBe(false);
  });

  it('refuse une empreinte invalide sans planter', async () => {
    await expect(service.verify('pas-une-empreinte', 'x')).resolves.toBe(false);
  });
});