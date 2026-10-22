/** SSRF: solo URLs de gist.github.com con un id hexadecimal (función pura, probada con Vitest). */
const GIST_URL = /^https:\/\/gist\.github\.com\/(?:[\w-]+\/)?([a-f0-9]{20,40})(?:[/?#].*)?$/i;

/** Id del Gist si la URL es de gist.github.com; null en cualquier otro caso. */
export function extraerIdGist(url: string): string | null {
  return url.trim().match(GIST_URL)?.[1] ?? null;
}
