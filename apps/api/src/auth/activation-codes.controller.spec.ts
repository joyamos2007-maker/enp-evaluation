import { ServiceUnavailableException } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import { ActivationCodesController } from './activation-codes.controller';

describe('ActivationCodesController', () => {
  const identity = { genererCodesActivation: jest.fn() };
  const campusScope = { forScolarite: jest.fn() };
  const email = { verifier: jest.fn() };
  const controller = new ActivationCodesController(
    identity as never,
    campusScope as never,
    email as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('permet au service Scolarité et à l’administration de tester SMTP', async () => {
    email.verifier.mockResolvedValue(undefined);

    await expect(controller.verifierSmtp()).resolves.toEqual({ ok: true });
    expect(email.verifier).toHaveBeenCalledTimes(1);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ActivationCodesController.prototype.verifierSmtp,
      ),
    ).toEqual(['scolarite', 'admin']);
  });

  it('retourne une erreur de service si SMTP échoue', async () => {
    email.verifier.mockRejectedValue(new Error('SMTP credentials rejected'));

    await expect(controller.verifierSmtp()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
