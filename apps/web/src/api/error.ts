import type { ErreurApi } from './types';

/**
 * Erreur normalisée levée par le client HTTP et le module de simulation.
 * Les messages peuvent être une chaîne unique ou un tableau (champs invalides).
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error: string | undefined;
  public readonly messages: string[];

  constructor(apiErreur: ErreurApi) {
    const messages = Array.isArray(apiErreur.message)
      ? apiErreur.message
      : [apiErreur.message];
    super(messages.join(' '));
    this.name = 'ApiError';
    this.statusCode = apiErreur.statusCode;
    this.error = apiErreur.error;
    this.messages = messages;
  }

  get estAuth(): boolean {
    return this.statusCode === 401;
  }

  get estVerrouille(): boolean {
    return this.statusCode === 429;
  }
}
