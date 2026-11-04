import { ROLES_KEY } from '../auth/roles.decorator';
import { AdministrationController } from './administration.controller';

describe('AdministrationController', () => {
  it('réserve la gestion des référentiels à l’administration technique', () => {
    const prototype = AdministrationController.prototype;
    const rolesDe = (nom: string) =>
      Reflect.getMetadata(ROLES_KEY, Object.getOwnPropertyDescriptor(prototype, nom)?.value);

    expect(Reflect.getMetadata(ROLES_KEY, AdministrationController)).toEqual(['admin']);
    expect(rolesDe('referentiels')).toBeUndefined();
    expect(rolesDe('creerCampus')).toBeUndefined();
    expect(rolesDe('creerDepartement')).toEqual(['admin']);
    expect(rolesDe('creerProgramme')).toEqual(['admin']);
    expect(rolesDe('listerScolarites')).toEqual(['admin']);
    expect(rolesDe('affecterScolarite')).toEqual(['admin']);
  });
});
