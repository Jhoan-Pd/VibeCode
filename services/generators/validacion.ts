import type { Bloque } from "@/schemas/analysis";

/**
 * Validación y saneamiento de los bloques que devuelve el LLM.
 * Lógica pura (sin LLM ni BD) => fácil de probar con Vitest.
 */

/** Ordena por inicio y resuelve solapes recortando el bloque posterior (descarta los que quedan vacíos). */
export function repararSolapes(bloques: Bloque[]): Bloque[] {
  const ordenados = [...bloques].sort((a, b) => a.lineaInicio - b.lineaInicio || a.lineaFin - b.lineaFin);
  const resultado: Bloque[] = [];
  let ultimoFin = 0;
  for (const b of ordenados) {
    const inicio = Math.max(b.lineaInicio, ultimoFin + 1);
    if (inicio > b.lineaFin) continue; // quedó totalmente cubierto por el anterior
    resultado.push({ ...b, lineaInicio: inicio });
    ultimoFin = b.lineaFin;
  }
  return resultado;
}

/**
 * Devuelve la lista de problemas (vacía = válido):
 *  - bloques fuera del rango pedido,
 *  - cobertura insuficiente de las líneas con código.
 */
export function validarBloques(
  bloques: Bloque[],
  rango: { inicio: number; fin: number },
  lineasDelRango: string[],
  coberturaMinima = 0.7,
): string[] {
  const problemas: string[] = [];

  const fuera = bloques.filter((b) => b.lineaInicio < rango.inicio || b.lineaFin > rango.fin);
  if (fuera.length > 0) {
    const ejemplos = fuera
      .slice(0, 3)
      .map((b) => `${b.lineaInicio}-${b.lineaFin}`)
      .join(", ");
    problemas.push(
      `Hay bloques fuera del rango permitido ${rango.inicio}-${rango.fin} (por ejemplo ${ejemplos}). Usa solo los números de línea mostrados.`,
    );
  }

  const conCodigo: number[] = [];
  lineasDelRango.forEach((l, i) => {
    if (l.trim() !== "") conCodigo.push(rango.inicio + i);
  });
  if (conCodigo.length > 0) {
    const cubiertas = conCodigo.filter((n) => bloques.some((b) => n >= b.lineaInicio && n <= b.lineaFin)).length;
    const cobertura = cubiertas / conCodigo.length;
    if (cobertura < coberturaMinima) {
      problemas.push(
        `Los bloques solo cubren el ${Math.round(cobertura * 100)}% de las líneas con código del rango ${rango.inicio}-${rango.fin}. Debes explicar todo el código con lógica.`,
      );
    }
  }
  return problemas;
}

/**
 * Valida rangos de línea OPCIONALES (glosario, auditoría, quiz): si vienen, deben estar
 * dentro del archivo y en orden. Devuelve problemas legibles para el reintento del LLM.
 */
export function validarRangosOpcionales(
  items: { lineaInicio?: number | null; lineaFin?: number | null }[],
  totalLineas: number,
  etiqueta: string,
): string[] {
  const malos = items
    .map((it, i) => ({ ...it, i }))
    .filter(({ lineaInicio: a, lineaFin: b }) => {
      if (a == null && b == null) return false;
      const inicio = a ?? b!;
      const fin = b ?? a!;
      return inicio < 1 || fin > totalLineas || fin < inicio;
    });
  if (malos.length === 0) return [];
  const ejemplos = malos
    .slice(0, 3)
    .map((m) => `${etiqueta} ${m.i + 1} (${m.lineaInicio ?? "null"}-${m.lineaFin ?? "null"})`)
    .join(", ");
  return [`Rangos de línea inválidos en ${ejemplos}. Deben estar entre 1 y ${totalLineas} y lineaFin >= lineaInicio, o ser null.`];
}

/** Completa el rango cuando solo viene uno de los extremos. */
export function normalizarRango<T extends { lineaInicio?: number | null; lineaFin?: number | null }>(
  item: T,
): Omit<T, "lineaInicio" | "lineaFin"> & { lineaInicio: number | null; lineaFin: number | null } {
  const inicio = item.lineaInicio ?? item.lineaFin ?? null;
  const fin = item.lineaFin ?? item.lineaInicio ?? null;
  return { ...item, lineaInicio: inicio, lineaFin: fin };
}

/**
 * Corrige de forma determinista rangos que el LLM suele errar por poco (como repararSolapes):
 * recorta el final al tamaño del archivo, invierte rangos al revés y descarta (null) los que
 * empiezan fuera del archivo. Es mejor que gastar un reintento del LLM por un desfase de una línea.
 */
export function ajustarRango<T extends { lineaInicio?: number | null; lineaFin?: number | null }>(
  item: T,
  totalLineas: number,
): Omit<T, "lineaInicio" | "lineaFin"> & { lineaInicio: number | null; lineaFin: number | null } {
  const { lineaInicio, lineaFin } = normalizarRango(item);
  if (lineaInicio == null || lineaFin == null) return { ...item, lineaInicio: null, lineaFin: null };
  let a = Math.min(lineaInicio, lineaFin);
  let b = Math.max(lineaInicio, lineaFin);
  if (a > totalLineas || b < 1) return { ...item, lineaInicio: null, lineaFin: null };
  a = Math.max(1, a);
  b = Math.min(totalLineas, b);
  return { ...item, lineaInicio: a, lineaFin: b };
}
