import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calificar } from "@/lib/quiz";
import { RespuestaValorSchema, aPreguntaPublica, type IntentoRequest, type PreguntaGuardada, type PreguntaPublica, type ResultadoQuiz, type TipoPregunta } from "@/schemas/quiz";

const OpcionesSchema = z.array(z.string()).nullable();

type PreguntaBD = Prisma.PreguntaGetPayload<object>;

/** Convierte la fila de BD al tipo de dominio, validando las columnas JSON (nunca se confía a ciegas). */
export function aPreguntaGuardada(p: PreguntaBD): PreguntaGuardada {
  return {
    id: p.id,
    orden: p.orden,
    tipo: p.tipo as TipoPregunta,
    enunciado: p.enunciado,
    opciones: OpcionesSchema.catch(null).parse(p.opciones ?? null),
    respuestaCorrecta: RespuestaValorSchema.catch(-1).parse(p.respuestaCorrecta),
    explicacion: p.explicacion,
    lineaInicio: p.lineaInicio,
    lineaFin: p.lineaFin,
    concepto: p.concepto,
  };
}

export interface QuizParaCliente {
  id: string;
  preguntas: PreguntaPublica[];
  /** Últimos intentos del usuario en este quiz (más reciente primero). */
  intentos: { id: string; porcentaje: number; nivelComprension: string; creadoEn: Date }[];
}

/** Quiz más reciente del análisis, sin respuestas, con los intentos del usuario. */
export async function obtenerQuizActual(analisisId: string, usuarioId: string | null): Promise<QuizParaCliente | null> {
  const quiz = await db.quiz.findFirst({
    where: { analisisId },
    orderBy: { creadoEn: "desc" },
    include: {
      preguntas: { orderBy: { orden: "asc" } },
      intentos: usuarioId
        ? { where: { usuarioId }, orderBy: { creadoEn: "desc" }, take: 5, select: { id: true, porcentaje: true, nivelComprension: true, creadoEn: true } }
        : false,
    },
  });
  if (!quiz) return null;
  return {
    id: quiz.id,
    preguntas: quiz.preguntas.map((p) => aPreguntaPublica(aPreguntaGuardada(p))),
    intentos: "intentos" in quiz && Array.isArray(quiz.intentos) ? quiz.intentos : [],
  };
}

/**
 * Califica en el SERVIDOR (el navegador nunca conoce las respuestas antes de enviar)
 * y guarda el intento con cada respuesta. Devuelve null si el quiz no es del análisis del usuario.
 */
export async function registrarIntento(analisisId: string, usuarioId: string, intento: IntentoRequest): Promise<ResultadoQuiz | null> {
  const quiz = await db.quiz.findFirst({
    where: { id: intento.quizId, analisisId, analisis: { usuarioId } },
    include: { preguntas: true },
  });
  if (!quiz) return null;

  const preguntas = quiz.preguntas.map(aPreguntaGuardada);
  const respuestas = Object.fromEntries(intento.respuestas.map((r) => [r.preguntaId, r.respuesta]));
  const resultado = calificar(preguntas, respuestas);

  await db.intentoQuiz.create({
    data: {
      quizId: quiz.id,
      usuarioId,
      aciertos: resultado.aciertos,
      total: resultado.total,
      porcentaje: resultado.porcentaje,
      nivelComprension: resultado.nivelComprension,
      respuestas: {
        create: resultado.resultados.map((r) => ({
          preguntaId: r.preguntaId,
          // Sin respuesta se guarda como JSON null (Prisma exige JsonNull explícito).
          respuesta: r.respuestaUsuario === null ? Prisma.JsonNull : r.respuestaUsuario,
          correcta: r.correcta,
        })),
      },
    },
  });
  return resultado;
}
