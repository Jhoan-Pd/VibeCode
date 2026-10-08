/**
 * Configuración central. Los límites son configurables por variables de entorno.
 * IMPORTANTE: las variables NEXT_PUBLIC_* deben leerse con acceso literal
 * (process.env.NEXT_PUBLIC_X) para que Next las inyecte también en el cliente.
 */

function entero(valor: string | undefined, porDefecto: number, min: number, max: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(Math.max(n, min), max);
}

/** Tamaño máximo del código (caracteres). Se valida en el cliente y, de forma definitiva, en el servidor. */
export const MAX_CODE_CHARS = entero(process.env.NEXT_PUBLIC_MAX_CODE_CHARS, 20_000, 500, 200_000);

/** Líneas por bloque cuando el código se divide para el LLM (solo servidor). */
export const CHUNK_LINES = entero(process.env.LLM_CHUNK_LINES, 120, 30, 400);

/** Timeout por llamada al LLM (ms). */
export const LLM_TIMEOUT_MS = entero(process.env.LLM_TIMEOUT_MS, 50_000, 5_000, 120_000);

/** Análisis NUEVOS (que llaman al LLM) por usuario y día. Los resultados desde caché no cuentan. */
export const LIMITE_ANALISIS_DIARIO = entero(process.env.DAILY_ANALYSIS_LIMIT, 10, 1, 1000);

/** Llamadas secundarias al LLM por usuario y día: regenerar etapas, corregir diagramas, quizzes nuevos y chat. */
export const LIMITE_CONSULTAS_DIARIAS = entero(process.env.DAILY_AI_QUERIES_LIMIT, 60, 1, 5000);

/** Zona horaria en la que se reinicia el contador diario. */
export const ZONA_HORARIA = process.env.APP_TIMEZONE || "America/Bogota";
