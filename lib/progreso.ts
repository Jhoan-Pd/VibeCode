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

/** Agrupa las respuestas por concepto y calcula el dominio ponderado. Orden: peor dominio primero. */
export function dominioPorConcepto(respuestas: RespuestaConcepto[]): ConceptoProgreso[] {
  const grupos = new Map<string, { nombre: string; items: RespuestaConcepto[] }>();
  for (const r of respuestas) {
    if (!r.concepto?.trim()) continue;
    const clave = normalizarConcepto(r.concepto);
    const g = grupos.get(clave) ?? { nombre: r.concepto.trim(), items: [] };
    g.items.push(r);
    grupos.set(clave, g);
  }

  const resultado: ConceptoProgreso[] = [];
  for (const { nombre, items } of grupos.values()) {
    const ordenadas = [...items].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let suma = 0;
    let pesos = 0;
    ordenadas.forEach((r, i) => {
      const peso = DECAIMIENTO ** (ordenadas.length - 1 - i);
      suma += (r.correcta ? 1 : 0) * peso;
      pesos += peso;
    });
    const dominio = redondear((suma / pesos) * 100);
    const fallada = [...ordenadas].reverse().find((r) => !r.correcta);
    const ref = fallada ?? ordenadas[ordenadas.length - 1];
    resultado.push({
      nombre,
      dominio,
      aciertos: ordenadas.filter((r) => r.correcta).length,
      total: ordenadas.length,
      estado: estadoDe(dominio),
      pocasRespuestas: ordenadas.length < 2,
      repaso: ref ? { analisisId: ref.analisisId, lineaInicio: ref.lineaInicio, lineaFin: ref.lineaFin } : null,
    });
  }
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
  if (mejores.size === 0) return null;
  return redondear([...mejores.values()].reduce((a, b) => a + b, 0) / mejores.size);
}

/**
 * Tendencia: compara el promedio de la mitad reciente de los intentos con la mitad antigua.
 * Devuelve la diferencia en puntos porcentuales, o null si hay menos de 4 intentos.
 */
export function tendencia(intentos: IntentoResumen[]): number | null {
  if (intentos.length < 4) return null;
  const orden = [...intentos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const mitad = Math.floor(orden.length / 2);
  const prom = (xs: IntentoResumen[]) => xs.reduce((a, b) => a + b.porcentaje, 0) / xs.length;
  return redondear(prom(orden.slice(orden.length - mitad)) - prom(orden.slice(0, mitad)));
}

/** Cuenta análisis por lenguaje (mayor a menor). */
export function conteoPorLenguaje(lenguajes: string[]): { lenguaje: string; cantidad: number }[] {
  const m = new Map<string, number>();
  for (const l of lenguajes) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m.entries()].map(([lenguaje, cantidad]) => ({ lenguaje, cantidad })).sort((a, b) => b.cantidad - a.cantidad || a.lenguaje.localeCompare(b.lenguaje));
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
