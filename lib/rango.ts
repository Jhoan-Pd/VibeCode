/**
 * Convierte el parámetro "?l=3-9" (o "?l=4") en un rango válido dentro del archivo.
 * Cualquier otra cosa (texto, rangos invertidos, líneas fuera del archivo) se ignora devolviendo null.
 */
export function rangoDesdeParametro(valor: string | undefined | null, totalLineas: number): { inicio: number; fin: number } | null {
  const m = valor?.match(/^(\d{1,6})(?:-(\d{1,6}))?$/);
  if (!m) return null;
  const inicio = Number(m[1]);
  const fin = Number(m[2] ?? m[1]);
  if (inicio < 1 || fin < inicio || inicio > totalLineas) return null;
  return { inicio, fin: Math.min(fin, totalLineas) };
}

/**
 * Núcleo común para los rangos que devuelve el LLM (que suele errar por una línea): completa el
 * extremo que falte, invierte un rango al revés y lo recorta al archivo. null si no hay rango o si
 * queda completamente fuera. Lo usan el quiz, el glosario y la auditoría.
 */
export function recortarRango(a: number | null | undefined, b: number | null | undefined, totalLineas: number): { inicio: number; fin: number } | null {
  const x = a ?? b;
  const y = b ?? a;
  if (x == null || y == null) return null;
  const inicio = Math.min(x, y);
  const fin = Math.max(x, y);
  if (inicio > totalLineas || fin < 1) return null;
  return { inicio: Math.max(1, inicio), fin: Math.min(totalLineas, fin) };
}
