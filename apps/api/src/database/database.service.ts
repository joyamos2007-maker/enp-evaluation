import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      this.logger.error('DATABASE_URL est vide : le fichier .env est introuvable ou mal rempli');
    }
    this.pool = new Pool({ connectionString: url });
    this.pool.on('error', (err) => {
      this.logger.error('Erreur de connexion a la base : ' + err.message);
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (err) {
      const e = err as { message?: string; code?: string; errors?: { message?: string }[] };
      const detail = e.message || (e.errors ?? []).map((x) => x.message).join(' | ') || String(err);
      this.logger.warn('Ping de la base echoue : ' + detail + (e.code ? ' (' + e.code + ')' : ''));
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}