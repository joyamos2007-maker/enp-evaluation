import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transport?: Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async enfiler(
    eventKey: string,
    destinataire: string,
    sujet: string,
    texte: string,
    expireLe?: Date,
    tentativesMax = 8,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO system.email_outbox
         (event_key, recipient, subject, body, expires_at, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_key) DO NOTHING`,
      [eventKey, destinataire, sujet, texte, expireLe ?? null, tentativesMax],
    );
  }

  async envoyer(
    destinataire: string,
    sujet: string,
    texte: string,
  ): Promise<void> {
    const transport = this.obtenirTransport();
    const from = this.config.get<string>('SMTP_FROM');
    if (!from)
      throw new Error(
        'SMTP_FROM doit etre configure pour envoyer les courriels',
      );
    try {
      await transport.sendMail({
        from,
        to: destinataire,
        subject: sujet,
        text: texte,
      });
    } catch (error) {
      this.logger.error('Echec de livraison du courriel');
      throw error;
    }
  }

  private obtenirTransport(): Transporter {
    if (this.transport) return this.transport;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !user ||
      !pass
    ) {
      throw new Error(
        'Configuration SMTP incomplete (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)',
      );
    }
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });
    return this.transport;
  }
}
