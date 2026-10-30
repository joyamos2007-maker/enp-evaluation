import type { BulletinEnvoye, ReponseSimple } from './types';
import { ApiError } from './error';

const BASE_URL = '/api/v1';

/**
 * Envoi du bulletin de vote : SÉPARÉ du client authentifié.
 *
 * fetch avec credentials: "omit" et SANS en-tête Authorization : le serveur
 * ne doit pas pouvoir identifier l'étudiant. Aucun horodatage dans le corps.
 */
export async function envoyerBulletin(
  bulletin: BulletinEnvoye,
): Promise<ReponseSimple> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/ballots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(bulletin),
    });
  } catch {
    throw new ApiError({
      message: "Erreur réseau : impossible d'envoyer votre bulletin. Vérifiez votre connexion et réessayez.",
      statusCode: 0,
    });
  }

  let payload: unknown = null;
  const texte = await res.text();
  if (texte) {
    try {
      payload = JSON.parse(texte);
    } catch {
      payload = texte;
    }
  }

  if (!res.ok) {
    const err = payload as { message?: string } | undefined;
    let message: string;
    if (res.status === 410) {
      message = "Votre jeton de vote a expiré. La campagne est peut-être terminée.";
    } else if (res.status === 409) {
      message = "Ce jeton a déjà été utilisé. Votre bulletin a peut-être déjà été envoyé.";
    } else if (res.status === 400) {
      message = err?.message ?? 'Certaines réponses sont invalides.';
    } else {
      message = err?.message ?? "Une erreur est survenue lors de l'envoi.";
    }
    throw new ApiError({ message, statusCode: res.status });
  }

  return (payload as ReponseSimple) ?? { ok: true };
}
