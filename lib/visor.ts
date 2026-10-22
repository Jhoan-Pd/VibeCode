/**
 * Lógica pura del visor (sin Monaco ni React), probada con Vitest.
 */

export interface RangoLineas {
  inicio: number;
  fin: number;
}

/**
 * Índice línea → bloque que la explica, como arreglo denso (posición = número de línea).
 * Se recorre el editor con el mouse y se consulta en cada movimiento: un arreglo da acceso O(1)
 * sin hashing y ocupa menos que un Map con una entrada por línea. -1 = línea sin explicación.
 * Si dos bloques se solapan gana el último, igual que antes.
 */
export function indicePorLinea(bloques: readonly { lineaInicio: number; lineaFin: number }[], totalLineas: number): Int32Array {
  const indice = new Int32Array(totalLineas + 1).fill(-1);
  bloques.forEach((b, i) => {
    const desde = Math.max(1, b.lineaInicio);
    const hasta = Math.min(totalLineas, b.lineaFin);
    if (desde <= hasta) indice.fill(i, desde, hasta + 1);
  });
  return indice;
}

/** Bloque de una línea, o null si no tiene explicación o está fuera del archivo. */
export function bloqueDeLinea(indice: Int32Array, linea: number): number | null {
  const i = linea >= 0 && linea < indice.length ? indice[linea] : -1;
  return i >= 0 ? i : null;
}

/**
 * Rango de líneas de una selección del editor. Si la selección termina al inicio de una línea
 * (columna 1, típico al arrastrar hasta el siguiente renglón), esa última línea no cuenta.
 */
export function rangoDeSeleccion(s: { startLineNumber: number; endLineNumber: number; endColumn: number }): RangoLineas {
  const fin = s.endColumn === 1 && s.endLineNumber > s.startLineNumber ? s.endLineNumber - 1 : s.endLineNumber;
  return { inicio: s.startLineNumber, fin };
}

/** Número de líneas de un texto (un texto vacío tiene 1 línea, como en el editor). */
export function contarLineas(texto: string): number {
  let n = 1;
  for (let i = texto.indexOf("\n"); i !== -1; i = texto.indexOf("\n", i + 1)) n++;
  return n;
}
