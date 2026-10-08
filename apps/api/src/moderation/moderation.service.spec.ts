import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const db = { query: jest.fn() };
  const urne = { lire: jest.fn() };
  const service = new ModerationService(db as never, urne as never);

  const BALLOT = '3d2ffb41-1f7c-464c-bccf-0d9ca21a3958';
  const ligne = (surcharge: Record<string, unknown> = {}) => ({
    ballot_id: BALLOT,
    type: 'points_forts',
    texte: 'Cours clair',
    statut: 'a_moderer',
    course_id: 1,
    ...surcharge,
  });
  const ue = { course_id: 1, code: 'INF501', intitule: 'Bases de donnees' };

  beforeEach(() => jest.resetAllMocks());

  describe('lister', () => {
    it('retourne 404 pour une campagne inconnue, sans toucher a l urne', async () => {
      db.query.mockResolvedValueOnce([]);
      await expect(service.lister(9)).rejects.toBeInstanceOf(NotFoundException);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('refuse (409) une campagne ouverte, sans preparer ni lire l urne', async () => {
      db.query.mockResolvedValueOnce([{ statut: 'ouverte' }]);
      await expect(service.lister(1)).rejects.toBeInstanceOf(ConflictException);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('refuse (409) pendant le delai de preparation', async () => {
      db.query.mockResolvedValueOnce([{ statut: 'close' }]).mockResolvedValueOnce([{ etat: 'attente' }]);
      await expect(service.lister(1)).rejects.toThrow('preparation');
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('retourne les commentaires avec un identifiant opaque et sans date ni auteur', async () => {
      db.query
        .mockResolvedValueOnce([{ statut: 'close' }])
        .mockResolvedValueOnce([{ etat: 'prete' }])
        .mockResolvedValueOnce([ue]);
      urne.lire.mockResolvedValueOnce([ligne()]);
      const res = await service.lister(1);
      expect(res).toEqual([
        {
          id: BALLOT + '.points_forts',
          ueCode: 'INF501',
          ueIntitule: 'Bases de donnees',
          type: 'points_forts',
          texte: 'Cours clair',
          statut: 'a_moderer',
        },
      ]);
      expect(Object.keys(res[0]).sort()).toEqual(['id', 'statut', 'texte', 'type', 'ueCode', 'ueIntitule']);
    });

    it('transmet le filtre de statut et le seuil, et melange l ordre', async () => {
      db.query
        .mockResolvedValueOnce([{ statut: 'close' }])
        .mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([]);
      await service.lister(1, 'valide');
      expect(urne.lire.mock.calls[0][1]).toEqual([1, 'valide', 5]);
      expect(urne.lire.mock.calls[0][0]).toContain('gen_random_uuid()');
      expect(urne.lire.mock.calls[0][0]).toContain('urne_melangee_le IS NOT NULL');
      expect(urne.lire.mock.calls[0][0]).toContain('HAVING COUNT(*) >= $3::int');
    });

    it('envoie null quand aucun filtre n est demande', async () => {
      db.query
        .mockResolvedValueOnce([{ statut: 'restituee' }])
        .mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([]);
      await service.lister(1);
      expect(urne.lire.mock.calls[0][1]).toEqual([1, null, 5]);
    });

    it('affiche un point d interrogation quand l UE est introuvable', async () => {
      db.query
        .mockResolvedValueOnce([{ statut: 'close' }])
        .mockResolvedValueOnce([{ etat: 'prete' }])
        .mockResolvedValueOnce([]);
      urne.lire.mockResolvedValueOnce([ligne()]);
      const [c] = await service.lister(1);
      expect(c.ueCode).toBe('?');
    });
  });

  describe('decider', () => {
    const ref = { ballotId: BALLOT, type: 'points_forts' as const };

    it('applique la decision via la fonction SQL puis relit le commentaire', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'ok' }]).mockResolvedValueOnce([ue]);
      urne.lire.mockResolvedValueOnce([ligne({ statut: 'masque' })]);
      const res = await service.decider(ref, 'masque', 2);
      expect(db.query.mock.calls[0][1]).toEqual([BALLOT, 'points_forts', 'masque', 2, 5]);
      expect(res).toMatchObject({ id: BALLOT + '.points_forts', statut: 'masque' });
    });

    it('ne transmet jamais de texte a la fonction de moderation', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'ok' }]).mockResolvedValueOnce([ue]);
      urne.lire.mockResolvedValueOnce([ligne()]);
      await service.decider(ref, 'valide', 2);
      expect(JSON.stringify(db.query.mock.calls[0])).not.toContain('Cours clair');
    });

    it('accepte une decision identique a l etat actuel', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'inchange' }]).mockResolvedValueOnce([ue]);
      urne.lire.mockResolvedValueOnce([ligne({ statut: 'valide' })]);
      await expect(service.decider(ref, 'valide', 2)).resolves.toMatchObject({ statut: 'valide' });
    });

    it('retourne 404 pour un commentaire introuvable', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'introuvable' }]);
      await expect(service.decider(ref, 'valide', 2)).rejects.toBeInstanceOf(NotFoundException);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('retourne 409 quand la campagne n est pas moderable', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'non_modifiable' }]);
      await expect(service.decider(ref, 'valide', 2)).rejects.toBeInstanceOf(ConflictException);
    });

    it('retourne 400 pour un statut invalide', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'statut_invalide' }]);
      await expect(service.decider(ref, 'valide', 2)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retourne 409 pour un etat inattendu', async () => {
      db.query.mockResolvedValueOnce([{ etat: 'bizarre' }]);
      await expect(service.decider(ref, 'valide', 2)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});