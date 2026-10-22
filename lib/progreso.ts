/**
 * Cálculos del dashboard de progreso. Funciones puras (sin BD) para poder probarlas con Vitest.
 *
 * Reglas:
 *  - El dominio de un concepto se mide con las respuestas del usuario a preguntas de ese concepto.
 *    Las respuestas recientes pesan más (media ponderada exponencial): si antes fallabas y ahora
 *    aciertas, el concepto sube aunque el histórico tenga fallos.
 *  - Un concepto con una sola respuesta se marca "pocas respuestas": no hay evidencia suficiente.
 *  - El promedio de comprensión usa el MEJOR intento de cada quiz, para no castigar los reintentos.
 */

import { agruparPor, contarPor } from "./colecciones";

export const UMBRAL_DOMINADO = 80;
export const UMBRAL_EN_PROGRESO = 50;
/** Peso del intento anterior respecto al siguiente (0.6 = cada respuesta nueva pesa ~1.7× la previa). */
const DECAIMIENTO = 0.6;

export type EstadoConcepto = "dominado" | "en_progreso" | "reforzar";

export interface RespuestaConcepto {
  concepto: string | null;
  correcta: boolean;
  fecha: Date;
  analisisId: string;
  lineaInicio: number | null;
  lineaFin: number | null;
}

export interface ConceptoProgreso {
  /** Nombre para mostrar (la primera forma vista). */
  nombre: string;
  /** Porcentaje de dominio ponderado (0–100, una cifra decimal). */
  dominio: number;
  aciertos: number;
  total: number;
  estado: EstadoConcepto;
  pocasRespuestas: boolean;
  /** Dónde repasar: la última pregunta fallada (o la última respondida) de este concepto. */
  repaso: { analisisId: string; lineaInicio: number | null; lineaFin: number | null } | null;
}

/** Clave de agrupación: "Recursión", " recursion " y "RECURSIÓN" son el mismo concepto. */
export function normalizarConcepto(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export function estadoDe(dominio: number): EstadoConcepto {
  if (dominio >= UMBRAL_DOMINADO) return "dominado";
  if (dominio >= UMBRAL_EN_PROGRESO) return "en_progreso";
  return "reforzar";
}

const redondear = (n: number) => Math.round(n * 10) / 10;
const promedio = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const contar = <T>(xs: readonly T[], pred: (x: T) => boolean) => xs.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);

/**
 * Media ponderada exponencial de una serie cronológica de aciertos, en %. Se calcula en una sola
 * pasada con la recurrencia S ← S·d + x, W ← W·d + 1 (equivale a pesar la respuesta i con d^(n-1-i)),
 * así que es O(n) y no necesita potencias.
 */
export function dominioPonderado(aciertosEnOrden: readonly boolean[], decaimiento = DECAIMIENTO): number {
  let suma = 0;
  let pesos = 0;
  for (const correcta of aciertosEnOrden) {
    suma = suma * decaimiento + (correcta ? 1 : 0);
    pesos = pesos * decaimiento + 1;
  }
  return pesos === 0 ? 0 : redondear((suma / pesos) * 100);
}

const porFecha = (a: { fecha: Date }, b: { fecha: Date }) => a.fecha.getTime() - b.fecha.getTime();

/** Agrupa las respuestas por concepto y calcula el dominio ponderado. Orden: peor dominio primero. */
export function dominioPorConcepto(respuestas: RespuestaConcepto[]): ConceptoProgreso[] {
  const conConcepto = respuestas.filter((r): r is RespuestaConcepto & { concepto: string } => !!r.concepto?.trim());
  const grupos = agruparPor(conConcepto, (r) => normalizarConcepto(r.concepto));

  const resultado = [...grupos.values()].map((items): ConceptoProgreso => {
    const ordenadas = [...items].sort(porFecha);
    const dominio = dominioPonderado(ordenadas.map((r) => r.correcta));
    // Dónde repasar: la última fallada; si no falló ninguna, la última respondida.
    const ref = ordenadas.findLast((r) => !r.correcta) ?? ordenadas[ordenadas.length - 1];
    return {
      nombre: items[0].concepto.trim(),
      dominio,
      aciertos: contar(ordenadas, (r) => r.correcta),
      total: ordenadas.length,
      estado: estadoDe(dominio),
      pocasRespuestas: ordenadas.length < 2,
      repaso: { analisisId: ref.analisisId, lineaInicio: ref.lineaInicio, lineaFin: ref.lineaFin },
    };
  });
  return resultado.sort((a, b) => a.dominio - b.dominio || b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
}

export interface IntentoResumen {
  quizId: string;
  analisisId: string;
  titulo: string;
  porcentaje: number;
  fecha: Date;
}

/** Promedio del mejor intento de cada quiz (null si no hay intentos). */
export function promedioMejoresIntentos(intentos: IntentoResumen[]): number | null {
  const mejores = new Map<string, number>();
  for (const i of intentos) mejores.set(i.quizId, Math.max(mejores.get(i.quizId) ?? 0, i.porcentaje));
  return mejores.size === 0 ? null : redondear(promedio([...mejores.values()]));
}

/**
 * Tendencia: compara el promedio de la mitad reciente de los intentos con la mitad antigua.
 * Devuelve la diferencia en puntos porcentuales, o null si hay menos de 4 intentos.
 */
export function tendencia(intentos: IntentoResumen[]): number | null {
  if (intentos.length < 4) return null;
  const porcentajes = [...intentos].sort(porFecha).map((i) => i.porcentaje);
  const mitad = Math.floor(porcentajes.length / 2);
  return redondear(promedio(porcentajes.slice(-mitad)) - promedio(porcentajes.slice(0, mitad)));
}

/** Cuenta análisis por lenguaje (mayor a menor). */
export function conteoPorLenguaje(lenguajes: string[]): { lenguaje: string; cantidad: number }[] {
  return [...contarPor(lenguajes, (l) => l).entries()].map(([lenguaje, cantidad]) => ({ lenguaje, cantidad })).sort((a, b) => b.cantidad - a.cantidad || a.lenguaje.localeCompare(b.lenguaje));
}

/** Días consecutivos (hasta hoy o ayer) con al menos un análisis o intento. Fechas como "AAAA-MM-DD". */
export function rachaDias(dias: string[], hoy: string): number {
  const set = new Set(dias);
  const menosUno = (d: string) => {
    const f = new Date(`${d}T12:00:00Z`);
    f.setUTCDate(f.getUTCDate() - 1);
    return f.toISOString().slice(0, 10);
  };
  let dia = set.has(hoy) ? hoy : menosUno(hoy);
  let racha = 0;
  while (set.has(dia)) {
    racha++;
    dia = menosUno(dia);
  }
  return racha;
}
