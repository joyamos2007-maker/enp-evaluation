import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResultatsService } from './resultats.service';

describe('ResultatsService', () => {
  const db = { query: jest.fn() };
  const urne = { lire: jest.fn() };
  const service = new ResultatsService(db as never, urne as never);

  const ens = { id: 30, roles: ['enseignant'] };
  const sco = { id: 2, roles: ['scolarite'] };
  const meta = (surcharge: Record<string, unknown> = {}) => ({
    ue_id: 1,
    code: 'INF501',
    intitule: 'Bases de donnees',
    campagne_id: 3,
    department_id: 12,
    statut: 'close',
    inscrits: 5,
    enseigne: true,
    ...surcharge,
  });
  const critere = (code: string, id: number, n: number[], sans = 0) => ({
    section_code: 'A',
    section_titre: 'Organisation',
    critere_id: id,
    critere_code: code,
    libelle: 'Libelle ' + code,
    n1: n[0],
    n2: n[1],
    n3: n[2],
    n4: n[3],
    n5: n[4],
    sans_avis: sans,
  });

  beforeEach(() => jest.resetAllMocks());

  describe('fiche', () => {
    it('retourne 404 quand l UE ou la campagne n existe pas', async () => {
      db.query.mockResolvedValueOnce([]);
      await expect(service.fiche(sco, 1, 3)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse (403) un enseignant qui n enseigne pas cette UE, sans preparer l urne', async () => {
      db.query.mockResolvedValueOnce([meta({ enseigne: false })]);
      await expect(service.fiche(ens, 1, 3)).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('refuse (409) une campagne qui n est pas close, sans toucher a l urne', async () => {
      db.query.mockResolvedValueOnce([meta({ statut: 'ouverte' })]);
      await expect(service.fiche(sco, 1, 3)).rejects.toBeInstanceOf(ConflictException);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('refuse (409) pendant le delai de preparation', async () => {
      db.query.mockResolvedValueOnce([meta()]).mockResolvedValueOnce([{ etat: 'attente' }]);
      await expect(service.fiche(ens, 1, 3)).rejects.toThrow('preparation');
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('n agrege rien sous le seuil de 5 repondants', async () => {
      db.query.mockResolvedValueOnce([meta()]).mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([{ n: 4 }]);
      const res = await service.fiche(ens, 1, 3);
      expect(res).toMatchObject({
        repondants: 4,
        detailDisponible: false,
        sections: [],
        pointsForts: [],
        pointsAAmeliorer: [],
        seuil: 5,
      });
      expect(urne.lire).toHaveBeenCalledTimes(1);
    });

    it('retourne le detail a partir de 5 repondants', async () => {
      db.query.mockResolvedValueOnce([meta()]).mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire
        .mockResolvedValueOnce([{ n: 6 }])
        .mockResolvedValueOnce([
          critere('A1', 10, [1, 1, 1, 1, 1], 1),
          critere('A2', 11, [0, 0, 0, 6, 0]),
        ])
        .mockResolvedValueOnce([
          { type: 'points_forts', texte: 'Clair' },
          { type: 'points_a_ameliorer', texte: 'Plus de TP' },
          { type: 'points_forts', texte: 'Bons exemples' },
        ]);
      const res = await service.fiche(ens, 1, 3);
      expect(res.detailDisponible).toBe(true);
      expect(res.repondants).toBe(6);
      expect(res.sections[0].moyenne).toBe(3.55);
      expect(res.sections[0].criteres[0]).toMatchObject({
        moyenne: 3,
        distribution: [1, 1, 1, 1, 1],
        sansAvis: 1,
      });
      expect(res.pointsForts).toEqual(['Clair', 'Bons exemples']);
      expect(res.pointsAAmeliorer).toEqual(['Plus de TP']);
    });

    it('laisse la Scolarite consulter une UE qu elle n enseigne pas', async () => {
      db.query
        .mockResolvedValueOnce([meta({ enseigne: false })])
        .mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([{ n: 2 }]);
      await expect(service.fiche(sco, 1, 3)).resolves.toMatchObject({ detailDisponible: false });
    });

    it('permet au Chef de département de consulter une UE de son seul département', async () => {
      const chef = { id: 45, roles: ['chef_departement'] };
      db.query.mockResolvedValueOnce([meta({ enseigne: false })]).mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([{ n: 4 }]);
      await expect(service.fiche(chef, 1, 3, null, 12)).resolves.toMatchObject({
        detailDisponible: false,
      });
      expect(db.query.mock.calls[0][1]).toEqual([1, 3, 45, null, 12]);
    });

    it('lit l urne seulement pour une campagne close et preparee, et seulement les commentaires valides', async () => {
      db.query.mockResolvedValueOnce([meta()]).mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire
        .mockResolvedValueOnce([{ n: 6 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      await service.fiche(ens, 1, 3);
      for (const appel of urne.lire.mock.calls) {
        expect(appel[0]).toContain('urne_melangee_le IS NOT NULL');
        expect(appel[0]).toContain("'close', 'restituee'");
      }
      expect(urne.lire.mock.calls[2][0]).toContain("cm.statut = 'valide'");
      expect(urne.lire.mock.calls[2][0]).toContain('gen_random_uuid()');
    });

    it('n interroge jamais l urne avec un identifiant d utilisateur', async () => {
      db.query.mockResolvedValueOnce([meta()]).mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire
        .mockResolvedValueOnce([{ n: 6 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      await service.fiche(ens, 1, 3);
      for (const appel of urne.lire.mock.calls) {
        expect(appel[1]).toEqual([3, 1]);
      }
    });
  });

  describe('mesUes', () => {
    const ligne = (ueId: number, code: string, campagneId = 3) => ({
      ue_id: ueId,
      code,
      intitule: 'Intitule ' + code,
      campagne_id: campagneId,
      libelle_campagne: 'Evaluation S5',
      inscrits: 40,
    });

    it('retourne une liste vide sans campagne close', async () => {
      db.query.mockResolvedValueOnce([]);
      await expect(service.mesUes(30)).resolves.toEqual([]);
      expect(urne.lire).not.toHaveBeenCalled();
    });

    it('prepare chaque campagne une seule fois et applique le seuil', async () => {
      db.query
        .mockResolvedValueOnce([ligne(1, 'INF501'), ligne(2, 'INF502')])
        .mockResolvedValueOnce([{ etat: 'prete' }]);
      urne.lire.mockResolvedValueOnce([{ campagne_id: 3, course_id: 1, n: 6 }]);
      const res = await service.mesUes(30);
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res).toEqual([
        expect.objectContaining({ ueId: 1, repondants: 6, detailDisponible: true, inscrits: 40 }),
        expect.objectContaining({ ueId: 2, repondants: 0, detailDisponible: false }),
      ]);
      expect(urne.lire.mock.calls[0][1]).toEqual([[3, 3], [1, 2]]);
    });

    it('masque les campagnes encore dans le delai de preparation', async () => {
      db.query
        .mockResolvedValueOnce([ligne(1, 'INF501')])
        .mockResolvedValueOnce([{ etat: 'attente' }]);
      await expect(service.mesUes(30)).resolves.toEqual([]);
      expect(urne.lire).not.toHaveBeenCalled();
    });
  });
});