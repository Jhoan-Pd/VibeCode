/**
 * Utilidades de colecciones (funciones puras, probadas con Vitest).
 * Usan Map/Set para que agrupar y quitar duplicados sea O(n) en lugar de O(n²).
 */

/** Conserva el primer elemento de cada clave, en el orden original. */
export function unicosPor<T>(items: readonly T[], clave: (item: T) => string): T[] {
  const vistos = new Set<string>();
  return items.filter((item) => {
    const k = clave(item);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Agrupa por clave conservando el orden de aparición de las claves y de los elementos. */
export function agruparPor<T>(items: readonly T[], clave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const k = clave(item);
    const grupo = grupos.get(k);
    if (grupo) grupo.push(item);
    else grupos.set(k, [item]);
  }
  return grupos;
}

/** Cuenta cuántas veces aparece cada clave. */
export function contarPor<T>(items: readonly T[], clave: (item: T) => string): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const item of items) {
    const k = clave(item);
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  return conteo;
}

/** Copia superficial de `obj` sin las claves indicadas (con tipo `Omit` exacto). */
export function omitir<T extends object, K extends keyof T>(obj: T, claves: readonly K[]): Omit<T, K> {
  const excluidas = new Set<PropertyKey>(claves);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !excluidas.has(k))) as Omit<T, K>;
}
