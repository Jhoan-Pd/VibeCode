import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { esReutilizable, type CandidatoCache } from "@/lib/cache";
import { omitir } from "@/lib/colecciones";
import { db } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/prompts";

const INCLUIR_TODO = {
  explicaciones: true,
  diagramas: true,
  conceptos: true,
  hallazgos: true,
  quizzes: { orderBy: { creadoEn: "desc" }, take: 1, include: { preguntas: true } },
} satisfies Prisma.AnalisisInclude;

type AnalisisCompleto = Prisma.AnalisisGetPayload<{ include: typeof INCLUIR_TODO }>;

/** Qué tiene guardado un análisis, en el formato que evalúa `esReutilizable` (lógica pura en lib/cache). */
function comoCandidato(a: AnalisisCompleto): CandidatoCache {
  return {
    estado: a.estado,
    versionPrompts: a.versionPrompts,
    tieneResumen: a.resumen !== null,
    bloques: a.explicaciones.length,
    diagramaFlujo: a.diagramas.some((d) => d.tipo === "FLUJO"),
    conceptos: a.conceptos.length,
    auditado: a.auditadoEn !== null,
    preguntas: a.quizzes[0]?.preguntas.length ?? 0,
  };
}

/** Claves de una fila hija que no se copian: la identidad y el vínculo con el análisis de origen. */
const IDENTIDAD = ["id", "analisisId"] as const;

/**
 * Busca un análisis ya hecho con el mismo hash (código + nivel). Prefiere uno del propio usuario
 * (se reutiliza tal cual) y si no, el más reciente de cualquier usuario (se copia).
 * Así el mismo código no vuelve a llamar al LLM.
 */
export async function buscarEnCache(hash: string, usuarioId: string): Promise<AnalisisCompleto | null> {
  const candidatos = await db.analisis.findMany({
    where: {
      hash,
      estado: "COMPLETO",
      versionPrompts: PROMPT_VERSION,
      auditadoEn: { not: null },
      resumen: { not: Prisma.DbNull },
      explicaciones: { some: {} },
      conceptos: { some: {} },
      diagramas: { some: { tipo: "FLUJO" } },
      quizzes: { some: { preguntas: { some: {} } } },
    },
    orderBy: { creadoEn: "desc" },
    take: 5,
    include: INCLUIR_TODO,
  });

  const validos = candidatos.filter((a) => esReutilizable(comoCandidato(a), PROMPT_VERSION));
  return validos.find((a) => a.usuarioId === usuarioId) ?? validos[0] ?? null;
}

/**
 * Copia un análisis de otro usuario al usuario actual (sin llamar al LLM). Solo se copia si el código
 * es idéntico (mismo hash), así que no se expone nada que el usuario no haya enviado ya.
 * No se copian los intentos del quiz ni el chat: son personales.
 */
export async function clonarAnalisis(origen: AnalisisCompleto, usuarioId: string, titulo: string) {
  const quiz = origen.quizzes[0];
  return db.analisis.create({
    data: {
      usuarioId,
      titulo,
      codigo: origen.codigo,
      lenguaje: origen.lenguaje,
      hash: origen.hash,
      nivel: origen.nivel,
      estado: "COMPLETO",
      resumen: origen.resumen ?? Prisma.DbNull,
      modelo: origen.modelo,
      versionPrompts: origen.versionPrompts,
      auditadoEn: origen.auditadoEn,
      origenCacheId: origen.origenCacheId ?? origen.id,
      explicaciones: { create: origen.explicaciones.map((e) => omitir(e, IDENTIDAD)) },
      diagramas: { create: origen.diagramas.map((d) => omitir(d, [...IDENTIDAD, "creadoEn"])) },
      conceptos: { create: origen.conceptos.map((c) => omitir(c, IDENTIDAD)) },
      hallazgos: { create: origen.hallazgos.map((h) => omitir(h, IDENTIDAD)) },
      quizzes: quiz
        ? {
            create: {
              preguntas: {
                create: quiz.preguntas.map((p) => ({
                  ...omitir(p, ["id", "quizId"]),
                  opciones: p.opciones ?? Prisma.DbNull,
                  respuestaCorrecta: p.respuestaCorrecta as Prisma.InputJsonValue,
                })),
              },
            },
          }
        : undefined,
    },
    select: { id: true },
  });
}
