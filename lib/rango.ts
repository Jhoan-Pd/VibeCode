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
