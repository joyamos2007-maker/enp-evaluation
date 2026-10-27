import { ROLES_KEY } from '../auth/roles.decorator';
import { AdministrationController } from './administration.controller';

describe('AdministrationController', () => {
  it('autorise la Direction à consulter les référentiels et ajouter un campus seulement', () => {
    const prototype = AdministrationController.prototype;
    const rolesDe = (nom: string) =>
      Reflect.getMetadata(ROLES_KEY, Object.getOwnPropertyDescriptor(prototype, nom)?.value);

    expect(rolesDe('referentiels')).toEqual(['admin', 'direction_etudes']);
    expect(rolesDe('creerCampus')).toEqual(['admin', 'direction_etudes']);
    expect(rolesDe('creerDepartement')).toEqual(['admin']);
    expect(rolesDe('creerProgramme')).toEqual(['admin']);
    expect(rolesDe('listerScolarites')).toEqual(['admin']);
    expect(rolesDe('affecterScolarite')).toEqual(['admin']);
  });
});
