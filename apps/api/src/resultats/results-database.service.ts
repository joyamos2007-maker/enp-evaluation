import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

export interface InfosRoleResultats {
  superuser: boolean;
  lit_registre: boolean;
  acces_identites: boolean;
  acces_referentiels: boolean;
  ecrit_urne: boolean;
}

// Retourne un message si le role de connexion a trop de droits
export function verifierRoleResultats(i: InfosRoleResultats): string | null {
  if (i.superuser) return 'Le role des resultats est un super-utilisateur';
  if (i.lit_registre) return 'Le role des resultats peut lire le registre de participation';
  if (i.acces_identites) return 'Le role des resultats a acces au schema identity';
  if (i.acces_referentiels) return 'Le role des resultats a acces au schema ref';
  if (i.ecrit_urne) return 'Le role des resultats peut ecrire dans l urne';
  return null;
}

@Injectable()
export class ResultsDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResultsDatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL_RESULTS');
    if (!url) throw new Error('DATABASE_URL_RESULTS manquant dans le fichier .env');
    for (const autre of ['DATABASE_URL', 'DATABASE_URL_BALLOT']) {
      if (url === config.get<string>(autre)) {
        throw new Error('DATABASE_URL_RESULTS doit etre differente de ' + autre + ' (roles distincts)');
      }
    }
    this.pool = new Pool({ connectionString: url, max: 5 });
    this.pool.on('error', (err) => {
      this.logger.error('Erreur de connexion a la lecture de l urne : ' + err.message);
    });
  }

  // L'application refuse de demarrer si ce role a trop de droits
  async onModuleInit(): Promise<void> {
    const res = await this.pool.query<InfosRoleResultats>(
      `SELECT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
              has_table_privilege(current_user, 'evaluation.participation_ledger', 'SELECT') AS lit_registre,
              has_schema_privilege(current_user, 'identity', 'USAGE') AS acces_identites,
              has_schema_privilege(current_user, 'ref', 'USAGE') AS acces_referentiels,
              (has_table_privilege(current_user, 'ballot.ballots', 'INSERT, UPDATE, DELETE')
               OR has_table_privilege(current_user, 'ballot.ballot_answers', 'INSERT, UPDATE, DELETE')
               OR has_table_privilege(current_user, 'ballot.ballot_comments', 'INSERT, UPDATE, DELETE')) AS ecrit_urne`,
    );
    const probleme = verifierRoleResultats(res.rows[0]);
    if (probleme) throw new Error(probleme);
  }

  async lire<T extends QueryResultRow>(texte: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query<T>(texte, params);
    return res.rows;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}