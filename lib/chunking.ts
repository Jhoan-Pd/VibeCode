/**
 * División de código largo en bloques para no exceder el límite de tokens de SALIDA del LLM
 * (la explicación línea por línea de 600 líneas no cabe en una sola respuesta).
 * Es lógica pura y testeable: no depende del LLM.
 */

export interface BloqueCodigo {
  /** Línea inicial (1-indexada, inclusiva) dentro del archivo completo. */
  inicio: number;
  /** Línea final (1-indexada, inclusiva). */
  fin: number;
  lineas: string[];
}

export function dividirLineas(codigo: string): string[] {
  return codigo.replace(/\r\n?/g, "\n").split("\n");
}

/**
 * Divide en bloques de como máximo `maxLineas` líneas. Intenta cortar en una línea en blanco
 * (frontera natural entre funciones/clases) buscando hacia atrás hasta un 30% del tamaño del bloque.
 */
export function dividirEnBloques(codigo: string, maxLineas: number): BloqueCodigo[] {
  const lineas = dividirLineas(codigo);
  if (maxLineas < 1) throw new Error("maxLineas debe ser >= 1");
  if (lineas.length <= maxLineas) return [{ inicio: 1, fin: lineas.length, lineas }];

  const bloques: BloqueCodigo[] = [];
  const margen = Math.max(1, Math.floor(maxLineas * 0.3));
  let inicio = 0; // índice 0-based

  while (inicio < lineas.length) {
    let finExclusivo = Math.min(inicio + maxLineas, lineas.length);
    if (finExclusivo < lineas.length) {
      // Busca una línea en blanco hacia atrás para cortar justo después de ella.
      for (let i = finExclusivo - 1; i > finExclusivo - 1 - margen && i > inicio; i--) {
        if (lineas[i].trim() === "") {
          finExclusivo = i + 1;
          break;
        }
      }
    }
    bloques.push({ inicio: inicio + 1, fin: finExclusivo, lineas: lineas.slice(inicio, finExclusivo) });
    inicio = finExclusivo;
  }
  return bloques;
}

/** Antepone el número de línea real a cada línea: "  12 | código". */
export function numerarLineas(lineas: string[], desde = 1): string {
  const ancho = String(desde + lineas.length - 1).length;
  return lineas.map((l, i) => `${String(desde + i).padStart(ancho, " ")} | ${l}`).join("\n");
}
