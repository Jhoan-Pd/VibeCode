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
