import { z } from "zod";

/**
 * Esquemas del quiz de comprensión.
 *  - Salida del LLM (PreguntaLLM): lo que pedimos generar.
 *  - Formato guardado en BD: opciones + respuestaCorrecta (JSON).
 *  - Formato público (PreguntaPublica): lo que recibe el navegador, SIN la respuesta correcta.
 *  - Respuesta del usuario e intento: lo que el navegador envía para calificar en el servidor.
 */

export const TIPOS_PREGUNTA = ["OPCION_MULTIPLE", "QUE_IMPRIME", "VERDADERO_FALSO", "QUE_PASA_SI", "ORDENAR"] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const TIPO_PREGUNTA_INFO: Record<TipoPregunta, string> = {
  OPCION_MULTIPLE: "Opción múltiple",
  QUE_IMPRIME: "¿Qué imprime o retorna?",
  VERDADERO_FALSO: "Verdadero o falso",
  QUE_PASA_SI: "¿Qué pasa si…?",
  ORDENAR: "Ordena los pasos",
};

/* ---------- Salida del LLM ---------- */

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const lineaOpcional = z.coerce.number().int().min(1).nullable().optional();
const opcion = texto(1, 300);

const base = {
  enunciado: texto(8, 800),
  explicacion: texto(10, 1000),
  lineaInicio: lineaOpcional,
  lineaFin: lineaOpcional,
  concepto: texto(2, 80).nullable().optional(),
};

/** "true"/"false" en texto también se aceptan: los LLM a veces devuelven el booleano como cadena. */
const booleano = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean());

const conOpciones = <T extends "OPCION_MULTIPLE" | "QUE_IMPRIME" | "QUE_PASA_SI">(tipo: T) =>
  z.object({
    tipo: z.literal(tipo),
    ...base,
    opciones: z.array(opcion).min(3).max(5),
    /** Índice (desde 0) de la opción correcta. */
    correcta: z.coerce.number().int().min(0),
  });

export const PreguntaLLMSchema = z.discriminatedUnion("tipo", [
  conOpciones("OPCION_MULTIPLE"),
  conOpciones("QUE_IMPRIME"),
  conOpciones("QUE_PASA_SI"),
  z.object({ tipo: z.literal("VERDADERO_FALSO"), ...base, correcta: booleano }),
  /** Los pasos vienen EN EL ORDEN CORRECTO; el servidor los baraja antes de guardarlos. */
  z.object({ tipo: z.literal("ORDENAR"), ...base, pasos: z.array(opcion).min(3).max(6) }),
]);
export type PreguntaLLM = z.infer<typeof PreguntaLLMSchema>;

export const QuizLLMSchema = z.object({
  preguntas: z.array(PreguntaLLMSchema).min(5).max(10),
});
export type QuizLLM = z.infer<typeof QuizLLMSchema>;

/* ---------- Formato guardado (columnas opciones y respuestaCorrecta) ---------- */

/** Respuesta: índice de opción, booleano (V/F) o permutación de índices (ORDENAR). */
export const RespuestaValorSchema = z.union([z.number().int().min(0).max(20), z.boolean(), z.array(z.number().int().min(0).max(20)).max(10)]);
export type RespuestaValor = z.infer<typeof RespuestaValorSchema>;

export interface PreguntaGuardada {
  id: string;
  orden: number;
  tipo: TipoPregunta;
  enunciado: string;
  opciones: string[] | null;
  respuestaCorrecta: RespuestaValor;
  explicacion: string;
  lineaInicio: number | null;
  lineaFin: number | null;
  concepto: string | null;
}

/** Lo que se envía al navegador ANTES de responder: nunca incluye la respuesta correcta ni la explicación. */
export type PreguntaPublica = Omit<PreguntaGuardada, "respuestaCorrecta" | "explicacion">;

export function aPreguntaPublica(p: PreguntaGuardada): PreguntaPublica {
  return {
    id: p.id,
    orden: p.orden,
    tipo: p.tipo,
    enunciado: p.enunciado,
    opciones: p.opciones,
    lineaInicio: p.lineaInicio,
    lineaFin: p.lineaFin,
    concepto: p.concepto,
  };
}

/* ---------- Intento del usuario ---------- */

export const IntentoRequestSchema = z.object({
  quizId: z.string().min(1).max(40),
  respuestas: z
    .array(z.object({ preguntaId: z.string().min(1).max(40), respuesta: RespuestaValorSchema.nullable() }))
    .max(10),
});
export type IntentoRequest = z.infer<typeof IntentoRequestSchema>;

export interface ResultadoPregunta {
  preguntaId: string;
  correcta: boolean;
  respuestaUsuario: RespuestaValor | null;
  respuestaCorrecta: RespuestaValor;
  explicacion: string;
  lineaInicio: number | null;
  lineaFin: number | null;
  concepto: string | null;
}

export interface ResultadoQuiz {
  aciertos: number;
  total: number;
  /** 0 a 100, redondeado a un decimal. */
  porcentaje: number;
  nivelComprension: NivelComprension;
  resultados: ResultadoPregunta[];
  /** Partes del código a repasar (preguntas falladas con rango de líneas). Vacío si aprobó. */
  repasar: { lineaInicio: number; lineaFin: number; concepto: string | null }[];
}

export type NivelComprension = "Excelente" | "Buena" | "Parcial" | "Insuficiente";

/** Umbral de aprobación pedido por la especificación: menos del 70 % => recomendar repaso. */
export const UMBRAL_APROBACION = 70;
