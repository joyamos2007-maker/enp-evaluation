import { BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service';

describe('ImportsService', () => {
  const db = { query: jest.fn() };
  const service = new ImportsService(db as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('importe une ligne avec le rôle accepté par le schéma d’identité', async () => {
    db.query.mockResolvedValueOnce([]);
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role\nETU-1,etu@example.test,DOE,Jane,etudiant\n',
    );

    await expect(service.importUsers(csv)).resolves.toEqual({
      totalRows: 1,
      successCount: 1,
      errorCount: 0,
      errors: [],
    });
    expect(db.query.mock.calls[0][0]).toContain(
      'INSERT INTO identity.user_roles (user_id, role, campus_id, department_id)',
    );
    expect(db.query.mock.calls[0][1]).toEqual([
      'ETU-1',
      'etu@example.test',
      'DOE',
      'Jane',
      'etudiant',
      null,
      null,
    ]);
  });

  it('rattache un import au campus du service Scolarité', async () => {
    db.query.mockResolvedValueOnce([]);
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role\nETU-2,etu2@example.test,DOE,John,etudiant\n',
    );
    await service.importUsers(csv, 7, ['scolarite']);
    expect(db.query.mock.calls[0][1]).toEqual([
      'ETU-2',
      'etu2@example.test',
      'DOE',
      'John',
      'etudiant',
      7,
      null,
    ]);
  });

  it('autorise l’administration à affecter un compte Scolarité par campus dans le CSV', async () => {
    db.query.mockResolvedValueOnce([]);
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role,campusId,departmentId\nSC-2,sc2@example.test,DOE,Jo,Scolarite,7,\n',
    );
    await expect(service.importUsers(csv, null, ['admin'])).resolves.toMatchObject({
      successCount: 1,
      errorCount: 0,
    });
    expect(db.query.mock.calls[0][1]).toEqual([
      'SC-2',
      'sc2@example.test',
      'DOE',
      'Jo',
      'scolarite',
      7,
      null,
    ]);
  });

  it('rattache un Chef de département au département fourni par l’administration', async () => {
    db.query
      .mockResolvedValueOnce([{ campus_id: 7 }])
      .mockResolvedValueOnce([]);
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role,campusId,departmentId\nCD-1,cd@example.test,DOE,Jo,chef_departement,,3\n',
    );
    await expect(service.importUsers(csv, null, ['admin'])).resolves.toMatchObject({
      successCount: 1,
      errorCount: 0,
    });
    expect(db.query.mock.calls[1][1]).toEqual([
      'CD-1',
      'cd@example.test',
      'DOE',
      'Jo',
      'chef_departement',
      7,
      3,
    ]);
  });

  it('empêche un service Scolarité de créer des rôles globaux ou privilégiés', async () => {
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role\nDIR-1,direction@example.test,DOE,Jane,direction_etudes\n',
    );
    await expect(service.importUsers(csv, 7, ['scolarite'])).resolves.toMatchObject({
      successCount: 0,
      errorCount: 1,
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rapporte les lignes invalides sans les envoyer à la base', async () => {
    const csv = Buffer.from(
      'matricule,email,nom,prenom,role\nETU-1,not-an-email,DOE,Jane,etudiant\n',
    );

    await expect(service.importUsers(csv)).resolves.toMatchObject({
      totalRows: 1,
      successCount: 0,
      errorCount: 1,
      errors: [{ ligne: 2, erreur: 'adresse email invalide' }],
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('refuse un en-tête différent du format pris en charge', async () => {
    await expect(
      service.importUsers(Buffer.from('email,nom,prenom\n')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
