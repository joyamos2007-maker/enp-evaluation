import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

export interface InfosRoleApp {
  superuser: boolean;
  acces_urne: boolean;
}

// Retourne un message si le role de connexion a trop de droits
export function verifierRoleApp(i: InfosRoleApp): string | null {
  if (i.superuser) {
    return 'Le role de connexion de l application est un super-utilisateur : utilisez le role app_main';
  }
  if (i.acces_urne) {
    return 'Le role de connexion de l application a acces a l urne (schema ballot) : utilisez le role app_main';
  }
  return null;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) {
      this.logger.error('DATABASE_URL est vide : le fichier .env est introuvable ou mal rempli');
    }
    for (const autre of ['DATABASE_URL_BALLOT', 'DATABASE_URL_RESULTS']) {
      if (url && url === config.get<string>(autre)) {
        throw new Error('DATABASE_URL doit etre differente de ' + autre + ' (roles distincts)');
      }
    }
    this.pool = new Pool({ connectionString: url });
    this.pool.on('error', (err) => {
      this.logger.error('Erreur de connexion a la base : ' + err.message);
    });
  }

  // Refuse de demarrer avec un role trop puissant. Si la base est injoignable
  // au demarrage, on previent seulement (la route /health le signalera).
  async onModuleInit(): Promise<void> {
    let infos: InfosRoleApp;
    try {
      const res = await this.pool.query<InfosRoleApp>(
        `SELECT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
                has_schema_privilege(current_user, 'ballot', 'USAGE') AS acces_urne`,
      );
      infos = res.rows[0];
    } catch (err) {
      this.logger.warn('Controle du role impossible au demarrage : ' + (err as Error).message);
      return;
    }
    const probleme = verifierRoleApp(infos);
    if (probleme) throw new Error(probleme);
  }

  async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query<T>(text, params);
    return res.rows;
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

// ============================================================================
// DÉCLARATION DU MODULE NESTJS
// ============================================================================
@Global() // Rends DatabaseService accessible partout sans re-import obligatoire
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // Exporte DatabaseService pour UsersService, ImportsService, etc.
})
export class DatabaseModule {}