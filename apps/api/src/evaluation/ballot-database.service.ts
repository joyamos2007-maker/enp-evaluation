import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

export interface InfosRoleUrne {
  superuser: boolean;
  lit_registre: boolean;
  acces_identites: boolean;
  acces_referentiels: boolean;
}

// Retourne un message si le role de connexion a trop de droits
export function verifierRoleUrne(i: InfosRoleUrne): string | null {
  if (i.superuser) return 'Le role de l urne est un super-utilisateur';
  if (i.lit_registre) return 'Le role de l urne peut lire le registre de participation';
  if (i.acces_identites) return 'Le role de l urne a acces au schema identity';
  if (i.acces_referentiels) return 'Le role de l urne a acces au schema ref';
  return null;
}

export interface Transaction {
  lire<T extends QueryResultRow>(texte: string, params?: unknown[]): Promise<T[]>;
  executer(texte: string, params?: unknown[]): Promise<{ lignes: number }>;
}

@Injectable()
export class BallotDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BallotDatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL_BALLOT');
    if (!url) throw new Error('DATABASE_URL_BALLOT manquant dans le fichier .env');
    if (url === config.get<string>('DATABASE_URL')) {
      throw new Error('DATABASE_URL_BALLOT doit etre differente de DATABASE_URL (roles distincts)');
    }
    this.pool = new Pool({ connectionString: url, max: 5 });
    this.pool.on('error', (err) => {
      this.logger.error('Erreur de connexion a l urne : ' + err.message);
    });
  }

  // L'application refuse de demarrer si le role de l'urne a trop de droits
  async onModuleInit(): Promise<void> {
    let infos: InfosRoleUrne;
    try {
      const res = await this.pool.query<InfosRoleUrne>(
        `SELECT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
                has_table_privilege(current_user, 'evaluation.participation_ledger', 'SELECT') AS lit_registre,
                has_schema_privilege(current_user, 'identity', 'USAGE') AS acces_identites,
                has_schema_privilege(current_user, 'ref', 'USAGE') AS acces_referentiels`,
      );
      infos = res.rows[0];
    } catch (err) {
      this.logger.warn('Controle du role urne impossible au demarrage : ' + (err as Error).message);
      return;
    }
    const probleme = verifierRoleUrne(infos);
    if (probleme) throw new Error(probleme);
  }

  // Tout ou rien : la moindre erreur annule l'ensemble
  async transaction<T>(travail: (tx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const tx: Transaction = {
      lire: async <R extends QueryResultRow>(texte: string, params: unknown[] = []) =>
        (await client.query<R>(texte, params)).rows,
      executer: async (texte: string, params: unknown[] = []) => ({
        lignes: (await client.query(texte, params)).rowCount ?? 0,
      }),
    };
    try {
      await client.query('BEGIN');
      const resultat = await travail(tx);
      await client.query('COMMIT');
      return resultat;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // connexion deja perdue : rien a annuler
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}