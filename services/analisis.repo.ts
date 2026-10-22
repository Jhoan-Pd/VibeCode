import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { TIPOS_MERMAID, type TipoMermaid } from "@/lib/mermaid";
import type { PreguntaNueva } from "@/lib/quiz";
import type { Bloque, Resumen } from "@/schemas/analysis";
import type { AuditorCodigo } from "./generators/auditor-codigo";
import type { EntradaCodigo } from "./generators/generador-base";
import type { DiagramaGenerado } from "./generators/generador-diagrama";
import type { Concepto } from "./generators/generador-explicacion";

type Hallazgo = Awaited<ReturnType<AuditorCodigo["auditar"]>>[number];
export type EstadoFinal = "COMPLETO" | "ERROR";

/** Diagramas que no son el de flujo (clases y secuencia): se reemplazan juntos. */
const TIPOS_ESTRUCTURALES = TIPOS_MERMAID.filter((t) => t !== "FLUJO");

/**
 * Repositorio del análisis (patrón Repository): todo el acceso a Postgres de las etapas vive aquí,
 * así AnalisisService solo orquesta y no conoce tablas ni transacciones.
 * Cada «reemplazar» borra y crea en una transacción, para que regenerar una etapa nunca deje
 * resultados mezclados del intento anterior y del nuevo.
 */
export const analisisRepo = {
  crear(data: Prisma.AnalisisUncheckedCreateInput) {
    return db.analisis.create({ data });
  },

  async cargarEntrada(analisisId: string): Promise<EntradaCodigo | null> {
    return db.analisis.findUnique({ where: { id: analisisId }, select: { codigo: true, lenguaje: true, nivel: true } });
  },

  async guardarResumen(analisisId: string, resumen: Resumen) {
    await db.analisis.update({ where: { id: analisisId }, data: { resumen: resumen as Prisma.InputJsonValue } });
  },

  async reemplazarBloques(analisisId: string, bloques: Bloque[]) {
    await db.$transaction([
      db.explicacionLinea.deleteMany({ where: { analisisId } }),
      db.explicacionLinea.createMany({ data: bloques.map((b, orden) => ({ analisisId, orden, ...b })) }),
    ]);
  },

  async guardarFlujo(analisisId: string, d: DiagramaGenerado) {
    await db.diagrama.upsert({
      where: { analisisId_tipo: { analisisId, tipo: "FLUJO" } },
      create: { analisisId, tipo: "FLUJO", titulo: d.titulo, codigoMermaid: d.mermaid },
      update: { titulo: d.titulo, codigoMermaid: d.mermaid },
    });
  },

  buscarDiagrama(analisisId: string, tipo: TipoMermaid) {
    return db.diagrama.findUnique({ where: { analisisId_tipo: { analisisId, tipo } } });
  },

  actualizarDiagrama(id: string, d: Pick<DiagramaGenerado, "titulo" | "mermaid">) {
    return db.diagrama.update({ where: { id }, data: { titulo: d.titulo, codigoMermaid: d.mermaid } });
  },

  async reemplazarEstructurales(analisisId: string, diagramas: DiagramaGenerado[]) {
    await db.$transaction([
      db.diagrama.deleteMany({ where: { analisisId, tipo: { in: TIPOS_ESTRUCTURALES } } }),
      db.diagrama.createMany({ data: diagramas.map((d) => ({ analisisId, tipo: d.tipo, titulo: d.titulo, codigoMermaid: d.mermaid })) }),
    ]);
  },

  async reemplazarConceptos(analisisId: string, conceptos: Concepto[]) {
    await db.$transaction([
      db.concepto.deleteMany({ where: { analisisId } }),
      db.concepto.createMany({ data: conceptos.map((c) => ({ analisisId, ...c })) }),
    ]);
  },

  /** Marca también `auditadoEn`: distingue «auditado sin hallazgos» de «aún sin auditar». */
  async reemplazarHallazgos(analisisId: string, hallazgos: Hallazgo[]) {
    await db.$transaction([
      db.hallazgoAuditoria.deleteMany({ where: { analisisId } }),
      db.hallazgoAuditoria.createMany({ data: hallazgos.map((h) => ({ analisisId, ...h })) }),
      db.analisis.update({ where: { id: analisisId }, data: { auditadoEn: new Date() } }),
    ]);
  },

  /** Un quiz nuevo NO borra los anteriores: sus intentos forman parte del historial de progreso. */
  async crearQuiz(analisisId: string, preguntas: PreguntaNueva[]) {
    await db.quiz.create({
      data: {
        analisisId,
        preguntas: {
          create: preguntas.map((p) => ({
            ...p,
            opciones: p.opciones ?? undefined,
            respuestaCorrecta: p.respuestaCorrecta as Prisma.InputJsonValue,
          })),
        },
      },
    });
  },

  async marcarEstado(analisisId: string, estado: EstadoFinal, errorMensaje: string | null) {
    await db.analisis.update({ where: { id: analisisId }, data: { estado, errorMensaje } });
  },

  /** ¿Quedó guardado al menos un resultado (resumen, explicación, diagrama, glosario o quiz)? */
  async tieneResultados(analisisId: string): Promise<boolean> {
    const a = await db.analisis.findUnique({
      where: { id: analisisId },
      select: { resumen: true, _count: { select: { explicaciones: true, diagramas: true, conceptos: true, quizzes: true } } },
    });
    return a != null && (a.resumen != null || Object.values(a._count).some((n) => n > 0));
  },
};
