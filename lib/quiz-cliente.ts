import type { PreguntaPublica, RespuestaValor, ResultadoPregunta } from "@/schemas/quiz";

/**
 * Lógica pura de la interfaz del quiz (sin React), probada con Vitest. El componente solo pinta;
 * aquí se decide el estado inicial, qué falta responder y cómo se describe una respuesta.
 */

export type Respuestas = Record<string, RespuestaValor | null>;
export type EstadoOpcion = "neutral" | "correcta" | "incorrecta";

/** ORDENAR arranca con el orden mostrado (el servidor ya lo barajó); el resto, sin responder. */
export function respuestasIniciales(preguntas: readonly PreguntaPublica[]): Respuestas {
  return Object.fromEntries(preguntas.map((p) => [p.id, p.tipo === "ORDENAR" ? (p.opciones ?? []).map((_, i) => i) : null]));
}

export function contarSinResponder(preguntas: readonly PreguntaPublica[], respuestas: Respuestas): number {
  return preguntas.reduce((n, p) => n + (respuestas[p.id] == null ? 1 : 0), 0);
}

/** «Te falta 1 pregunta.» / «Te faltan 3 preguntas.» */
export function textoFaltan(n: number): string {
  return n === 1 ? "Te falta 1 pregunta." : `Te faltan ${n} preguntas.`;
}

/** Intercambia el paso `pos` con su vecino (`delta` = ±1). Devuelve el mismo arreglo si se sale de los bordes. */
export function moverPaso(orden: readonly number[], pos: number, delta: -1 | 1): readonly number[] {
  const destino = pos + delta;
  if (destino < 0 || destino >= orden.length) return orden;
  const nuevo = [...orden];
  [nuevo[pos], nuevo[destino]] = [nuevo[destino], nuevo[pos]];
  return nuevo;
}

/** A, B, C… para las opciones. */
export const letraOpcion = (i: number) => String.fromCharCode(65 + i);

/** Cómo se pinta una opción una vez calificado: la correcta en verde, la elegida errónea en rojo. */
export function estadoOpcion(resultado: ResultadoPregunta | undefined, valor: RespuestaValor, elegida: boolean): EstadoOpcion {
  if (!resultado) return "neutral";
  if (resultado.respuestaCorrecta === valor) return "correcta";
  return elegida ? "incorrecta" : "neutral";
}

/** Texto legible de una respuesta (para «Respuesta correcta: …»). */
export function describirRespuesta(p: Pick<PreguntaPublica, "opciones">, valor: RespuestaValor): string {
  if (typeof valor === "boolean") return valor ? "Verdadero" : "Falso";
  if (Array.isArray(valor)) return valor.map((i, n) => `${n + 1}) ${p.opciones?.[i] ?? "?"}`).join("  ");
  return `${letraOpcion(valor)}. ${p.opciones?.[valor] ?? ""}`;
}
