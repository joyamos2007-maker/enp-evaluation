import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const settings: Record<string, string> = {
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '587',
        SMTP_USER: 'mailer',
        SMTP_PASSWORD: 'secret',
        SMTP_SECURE: 'false',
        SMTP_FROM: 'ENP <mailer@example.test>',
      };
      return settings[key];
    }),
  };
  const db = { query: jest.fn() };
  let service: EmailService;

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockClear();
    service = new EmailService(config as unknown as ConfigService, db as never);
  });

  it('vérifie la connexion et l’authentification sans envoyer de message', async () => {
    const transport = { verify: jest.fn().mockResolvedValue(true) };
    const createTransport = jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue(transport as never);

    await service.verifier();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        auth: { user: 'mailer', pass: 'secret' },
      }),
    );
    expect(transport.verify).toHaveBeenCalledTimes(1);
  });

  it('remonte une erreur de connexion SMTP', async () => {
    const transport = { verify: jest.fn().mockRejectedValue(new Error('offline')) };
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transport as never);

    await expect(service.verifier()).rejects.toThrow('offline');
  });
});
