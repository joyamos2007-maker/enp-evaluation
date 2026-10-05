export function lireCookie(
  entete: string | string[] | undefined,
  nom: string,
): string | null {
  const brut = Array.isArray(entete) ? entete.join(';') : entete;
  if (!brut) return null;

  for (const morceau of brut.split(';')) {
    const i = morceau.indexOf('=');
    if (i === -1) continue;
    if (morceau.slice(0, i).trim() !== nom) continue;
    try {
      return decodeURIComponent(morceau.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}