import { unicosPor } from "@/lib/colecciones";
import {
  UMBRAL_APROBACION,
  type NivelComprension,
  type PreguntaGuardada,
  type PreguntaLLM,
  type QuizLLM,
  type RespuestaValor,
  type ResultadoPregunta,
  type ResultadoQuiz,
} from "@/schemas/quiz";

/**
 * Lógica pura del quiz (sin BD ni LLM): preparar preguntas, validarlas y calificar.
 * Se usa en el servidor para calificar los intentos y en la demo de la landing.
 */

/* ---------- Barajado determinista para ORDENAR ---------- */

function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Permutación de 0..n-1 que NUNCA es la identidad (si n >= 2): así la pregunta ORDENAR
 * nunca aparece ya resuelta. Es determinista (misma semilla => mismo orden) para poder probarla.
 */
export function barajarDistinto(n: number, semilla: string): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return indices;
  const azar = mulberry32(semillaDe(semilla));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (indices.every((v, i) => v === i)) indices.push(indices.shift()!);
  return indices;
}

/** Inversa de una permutación en O(n): si `p[k] = i`, entonces `inversa[i] = k`. */
export function invertirPermutacion(p: readonly number[]): number[] {
  const inversa = new Array<number>(p.length);
  p.forEach((original, posicion) => {
    inversa[original] = posicion;
  });
  return inversa;
}

/* ---------- De la salida del LLM al formato guardado ---------- */

export type PreguntaNueva = Omit<PreguntaGuardada, "id">;

/** Recorta el rango al archivo (o lo anula si queda fuera): el LLM suele equivocarse por una línea. */
function rangoSeguro(a: number | null | undefined, b: number | null | undefined, total: number): [number | null, number | null] {
  const ini = a ?? b ?? null;
  const fin = b ?? a ?? null;
  if (ini == null || fin == null) return [null, null];
  const x = Math.min(ini, fin);
  const y = Math.max(ini, fin);
  if (x > total || y < 1) return [null, null];
  return [Math.max(1, x), Math.min(total, y)];
}

export function prepararPreguntas(preguntas: PreguntaLLM[], totalLineas = Number.POSITIVE_INFINITY): PreguntaNueva[] {
  return preguntas.map((p, orden) => {
    const [lineaInicio, lineaFin] = rangoSeguro(p.lineaInicio, p.lineaFin, totalLineas);
    const comun = {
      orden,
      tipo: p.tipo,
      enunciado: p.enunciado,
      explicacion: p.explicacion,
      lineaInicio,
      lineaFin,
      concepto: p.concepto?.trim() || null,
    };
    switch (p.tipo) {
      case "VERDADERO_FALSO":
        return { ...comun, opciones: null, respuestaCorrecta: p.correcta };
      case "ORDENAR": {
        // permutacion[k] = índice ORIGINAL (correcto) del paso que se muestra en la posición k.
        const permutacion = barajarDistinto(p.pasos.length, p.enunciado + p.pasos.join("|"));
        const opciones = permutacion.map((i) => p.pasos[i]);
        // Respuesta correcta: posiciones mostradas, en el orden real de ejecución (la permutación inversa).
        const respuestaCorrecta = invertirPermutacion(permutacion);
        return { ...comun, opciones, respuestaCorrecta };
      }
      default:
        return { ...comun, opciones: p.opciones, respuestaCorrecta: p.correcta };
    }
  });
}

/**
 * Validación semántica del quiz generado (lista vacía = válido). Los rangos de línea no se validan
 * aquí: prepararPreguntas los corrige de forma determinista.
 */
/** ¿Hay textos repetidos sin distinguir mayúsculas ni espacios en los extremos? */
function hayRepetidos(textos: readonly string[]): boolean {
  return new Set(textos.map((t) => t.trim().toLowerCase())).size !== textos.length;
}

export function validarQuiz(quiz: QuizLLM): string[] {
  const problemas: string[] = [];
  quiz.preguntas.forEach((p, i) => {
    const n = i + 1;
    if ("opciones" in p) {
      if (p.correcta >= p.opciones.length) problemas.push(`Pregunta ${n}: "correcta" (${p.correcta}) no es un índice válido de "opciones".`);
      if (hayRepetidos(p.opciones)) problemas.push(`Pregunta ${n}: hay opciones repetidas.`);
    }
    if (p.tipo === "ORDENAR" && hayRepetidos(p.pasos)) problemas.push(`Pregunta ${n}: hay pasos repetidos.`);
  });
  const tipos = new Set(quiz.preguntas.map((p) => p.tipo));
  if (tipos.size < 3) problemas.push(`Usa al menos 3 tipos de pregunta distintos (ahora hay ${tipos.size}).`);
  return problemas;
}

/* ---------- Calificación ---------- */

export function esCorrecta(pregunta: Pick<PreguntaGuardada, "tipo" | "respuestaCorrecta" | "opciones">, respuesta: RespuestaValor | null | undefined): boolean {
  if (respuesta === null || respuesta === undefined) return false;
  const correcta = pregunta.respuestaCorrecta;
  if (pregunta.tipo === "VERDADERO_FALSO") return typeof respuesta === "boolean" && respuesta === correcta;
  if (pregunta.tipo === "ORDENAR") {
    if (!Array.isArray(respuesta) || !Array.isArray(correcta)) return false;
    return respuesta.length === correcta.length && respuesta.every((v, i) => v === correcta[i]);
  }
  return typeof respuesta === "number" && respuesta === correcta;
}

export function nivelComprension(porcentaje: number): NivelComprension {
  if (porcentaje >= 90) return "Excelente";
  if (porcentaje >= UMBRAL_APROBACION) return "Buena";
  if (porcentaje >= 50) return "Parcial";
  return "Insuficiente";
}

/**
 * Califica un intento. Las preguntas sin respuesta cuentan como incorrectas.
 * Si el puntaje es menor al 70 %, `repasar` lista las líneas de las preguntas falladas (sin duplicados).
 */
export function calificar(preguntas: PreguntaGuardada[], respuestas: Record<string, RespuestaValor | null | undefined>): ResultadoQuiz {
  const resultados: ResultadoPregunta[] = [...preguntas]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => {
      const r = respuestas[p.id] ?? null;
      return {
        preguntaId: p.id,
        correcta: esCorrecta(p, r),
        respuestaUsuario: r,
        respuestaCorrecta: p.respuestaCorrecta,
        explicacion: p.explicacion,
        lineaInicio: p.lineaInicio,
        lineaFin: p.lineaFin,
        concepto: p.concepto,
      };
    });

  const total = resultados.length;
  const aciertos = resultados.filter((r) => r.correcta).length;
  const porcentaje = total === 0 ? 0 : Math.round((aciertos / total) * 1000) / 10;

  const repasar = porcentaje < UMBRAL_APROBACION ? lineasARepasar(resultados) : [];
  return { aciertos, total, porcentaje, nivelComprension: nivelComprension(porcentaje), resultados, repasar };
}

/** Rangos de las preguntas falladas, sin duplicados y ordenados por línea. */
function lineasARepasar(resultados: readonly ResultadoPregunta[]): ResultadoQuiz["repasar"] {
  const rangos = resultados.flatMap((r) =>
    r.correcta || r.lineaInicio == null ? [] : [{ lineaInicio: r.lineaInicio, lineaFin: r.lineaFin ?? r.lineaInicio, concepto: r.concepto }],
  );
  return unicosPor(rangos, (r) => `${r.lineaInicio}-${r.lineaFin}`).sort((a, b) => a.lineaInicio - b.lineaInicio);
}
