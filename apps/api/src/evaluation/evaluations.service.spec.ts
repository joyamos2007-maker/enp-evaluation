import { NotFoundException } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';

describe('EvaluationsService', () => {
  const db = { query: jest.fn() };
  const service = new EvaluationsService(db as never);

  beforeEach(() => db.query.mockReset());

  it('liste les UE a evaluer en camelCase, sans nom d enseignant', async () => {
    const fin = new Date('2030-01-01T00:00:00Z');
    db.query.mockResolvedValue([
      { ue_id: 3, code: 'INF501', intitule: 'Bases de donnees', etat: 'a_faire', campagne_id: 2, fin_campagne: fin },
    ]);
    const res = await service.aFaire(42);
    expect(db.query.mock.calls[0][1]).toEqual([42]);
    expect(res).toEqual([
      { ueId: 3, code: 'INF501', intitule: 'Bases de donnees', etat: 'a_faire', campagneId: 2, finCampagne: fin },
    ]);
    expect(JSON.stringify(res)).not.toContain('enseignant');
  });

  it('retourne une liste vide quand rien n est a evaluer', async () => {
    db.query.mockResolvedValue([]);
    await expect(service.aFaire(42)).resolves.toEqual([]);
  });

  it('refuse un questionnaire pour une campagne fermee ou inexistante', async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(service.questionnaire(9)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('regroupe les criteres par section dans l ordre', async () => {
    db.query
      .mockResolvedValueOnce([{ version_id: 1 }])
      .mockResolvedValueOnce([
        { section_code: 'A', titre: 'Organisation', critere_id: 1, critere_code: 'A1', libelle: 'Objectifs' },
        { section_code: 'A', titre: 'Organisation', critere_id: 2, critere_code: 'A2', libelle: 'Contenu' },
        { section_code: 'B', titre: 'Qualite', critere_id: 3, critere_code: 'B1', libelle: 'Explications' },
      ])
      .mockResolvedValueOnce([{ type: 'points_forts', libelle: 'Points forts' }]);
    const res = await service.questionnaire(5);
    expect(res.versionId).toBe(1);
    expect(res.sections.map((s) => s.code)).toEqual(['A', 'B']);
    expect(res.sections[0].criteres).toHaveLength(2);
    expect(res.sections[1].criteres[0]).toEqual({ id: 3, code: 'B1', libelle: 'Explications' });
    expect(res.commentaires).toEqual([{ type: 'points_forts', libelle: 'Points forts' }]);
  });
});