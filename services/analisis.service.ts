import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AnalysisEvent } from "@/lib/analysis-events";
import { db } from "@/lib/db";
import { hashCodigo } from "@/lib/hash";
import { detectLanguage } from "@/lib/language";
import { LLMError, mensajeAmigable, type LLMProvider } from "@/lib/llm/types";
import { PROMPT_VERSION } from "@/lib/prompts";
import type { TipoMermaid } from "@/lib/mermaid";
import { ETAPAS, type AnalyzeRequest, type Etapa } from "@/schemas/analysis";
import { AuditorCodigo } from "./generators/auditor-codigo";
import { GeneradorDiagrama } from "./generators/generador-diagrama";
import { GeneradorExplicacion, type EntradaCodigo } from "./generators/generador-explicacion";
import { GeneradorQuiz } from "./generators/generador-quiz";

type Emitir = (evento: AnalysisEvent) => void;


/**
 * Orquesta el análisis: crea el registro, ejecuta las etapas y persiste cada resultado.
 * Las etapas son independientes entre sí (todas parten del código), así que se ejecutan EN PARALELO:
 * baja la latencia total (importante por el timeout de las funciones serverless) y, si una falla
 * (p. ej. el diagrama), el usuario conserva el resto y puede regenerar solo esa etapa.
 */
export class AnalisisService {
  private readonly explicacion: GeneradorExplicacion;
  private readonly diagrama: GeneradorDiagrama;
  private readonly quiz: GeneradorQuiz;
  private readonly auditor: AuditorCodigo;

  constructor(private readonly provider: LLMProvider) {
    this.explicacion = new GeneradorExplicacion(provider);
    this.diagrama = new GeneradorDiagrama(provider);
    this.quiz = new GeneradorQuiz(provider);
    this.auditor = new AuditorCodigo(provider);
  }

  /** Crea el registro en estado PROCESANDO. Resuelve el lenguaje si el usuario eligió "auto". */
  async crear(usuarioId: string, input: AnalyzeRequest) {
    const lenguaje = input.lenguaje === "auto" ? detectLanguage(input.codigo) : input.lenguaje;
    const titulo = input.titulo?.trim() || tituloAutomatico(input.codigo, lenguaje);
    return db.analisis.create({
      data: {
        usuarioId,
        titulo,
        codigo: input.codigo,
        lenguaje,
        nivel: input.nivel,
        hash: hashCodigo(input.codigo, input.nivel),
        estado: "PROCESANDO",
        modelo: `${this.provider.name}:${this.provider.model}`,
        versionPrompts: PROMPT_VERSION,
      },
    });
  }

  /** Ejecuta todas las etapas y deja el análisis en COMPLETO o ERROR. Nunca lanza: reporta por `emitir`. */
  async ejecutar(analisisId: string, emitir: Emitir = () => {}): Promise<void> {
    const analisis = await db.analisis.findUnique({ where: { id: analisisId } });
    if (!analisis) {
      emitir({ type: "error", message: "Análisis no encontrado" });
      return;
    }
    const entrada: EntradaCodigo = { codigo: analisis.codigo, lenguaje: analisis.lenguaje, nivel: analisis.nivel };

    const resultados = await Promise.all(ETAPAS.map((etapa) => this.ejecutarEtapa(analisisId, etapa, entrada, emitir)));
    const errores = resultados.filter((r): r is string => r !== null);
    const todasFallaron = errores.length === ETAPAS.length;

    await db.analisis.update({
      where: { id: analisisId },
      data: {
        estado: todasFallaron ? "ERROR" : "COMPLETO",
        errorMensaje: errores.length > 0 ? [...new Set(errores)].join(" ") : null,
      },
    });
    emitir({
      type: "done",
      analisisId,
      estado: todasFallaron ? "ERROR" : "COMPLETO",
      message: errores[0],
    });
  }

  /** Regenera una sola etapa (botón "Reintentar" cuando falló o quedó incompleta). */
  async regenerarEtapa(analisisId: string, etapa: Etapa): Promise<string | null> {
    const analisis = await db.analisis.findUnique({ where: { id: analisisId } });
    if (!analisis) return "Análisis no encontrado";
    const entrada: EntradaCodigo = { codigo: analisis.codigo, lenguaje: analisis.lenguaje, nivel: analisis.nivel };
    const error = await this.ejecutarEtapa(analisisId, etapa, entrada, () => {});

    // Recalcula el estado global a partir de lo que hay guardado.
    const a = await db.analisis.findUnique({
      where: { id: analisisId },
      select: { resumen: true, _count: { select: { explicaciones: true, diagramas: true, conceptos: true, quizzes: true } } },
    });
    const hayAlgo = a != null && (a.resumen != null || Object.values(a._count).some((n) => n > 0));
    await db.analisis.update({
      where: { id: analisisId },
      data: { estado: hayAlgo ? "COMPLETO" : "ERROR", errorMensaje: error },
    });
    return error;
  }

  /** Devuelve null si salió bien, o el mensaje amigable del error. */
  private async ejecutarEtapa(analisisId: string, etapa: Etapa, entrada: EntradaCodigo, emitir: Emitir): Promise<string | null> {
    emitir({ type: "stage", etapa, status: "running" });
    try {
      switch (etapa) {
        case "resumen": {
          const resumen = await this.explicacion.generarResumen(entrada);
          await db.analisis.update({ where: { id: analisisId }, data: { resumen: resumen as Prisma.InputJsonValue } });
          break;
        }
        case "lineas": {
          const bloques = await this.explicacion.generarBloques(entrada);
          await db.$transaction([
            db.explicacionLinea.deleteMany({ where: { analisisId } }),
            db.explicacionLinea.createMany({
              data: bloques.map((b, i) => ({
                analisisId,
                orden: i,
                lineaInicio: b.lineaInicio,
                lineaFin: b.lineaFin,
                titulo: b.titulo,
                explicacion: b.explicacion,
              })),
            }),
          ]);
          break;
        }
        case "diagrama": {
          // El de flujo es obligatorio; los de clases/secuencia son un extra: si fallan, no tumban la etapa.
          const [flujo, extras] = await Promise.allSettled([this.diagrama.generarFlujo(entrada), this.diagrama.generarEstructurales(entrada)]);
          if (flujo.status === "rejected") throw flujo.reason;
          const d = flujo.value;
          await db.diagrama.upsert({
            where: { analisisId_tipo: { analisisId, tipo: "FLUJO" } },
            create: { analisisId, tipo: "FLUJO", titulo: d.titulo, codigoMermaid: d.mermaid },
            update: { titulo: d.titulo, codigoMermaid: d.mermaid },
          });
          if (extras.status === "fulfilled") {
            await db.$transaction([
              db.diagrama.deleteMany({ where: { analisisId, tipo: { in: ["CLASES", "SECUENCIA"] } } }),
              db.diagrama.createMany({
                data: extras.value.map((x) => ({ analisisId, tipo: x.tipo, titulo: x.titulo, codigoMermaid: x.mermaid })),
              }),
            ]);
          } else {
            console.error(`[analisis ${analisisId}] diagramas de clases/secuencia fallaron:`, extras.reason);
          }
          break;
        }
        case "glosario": {
          const conceptos = await this.explicacion.generarGlosario(entrada);
          await db.$transaction([
            db.concepto.deleteMany({ where: { analisisId } }),
            db.concepto.createMany({ data: conceptos.map((c) => ({ analisisId, ...c })) }),
          ]);
          break;
        }
        case "auditoria": {
          const hallazgos = await this.auditor.auditar(entrada);
          await db.$transaction([
            db.hallazgoAuditoria.deleteMany({ where: { analisisId } }),
            db.hallazgoAuditoria.createMany({ data: hallazgos.map((h) => ({ analisisId, ...h })) }),
          ]);
          break;
        }
        case "quiz": {
          // Un quiz nuevo NO borra los anteriores: sus intentos forman parte del historial de progreso.
          const preguntas = await this.quiz.generar(entrada);
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
          break;
        }
        default: {
          const _exhaustivo: never = etapa;
          throw new Error(`Etapa desconocida: ${String(_exhaustivo)}`);
        }
      }
      emitir({ type: "stage", etapa, status: "done" });
      return null;
    } catch (error) {
      const mensaje = mensajeAmigable(error);
      // Los detalles técnicos se quedan en el log del servidor; al usuario solo le llega el mensaje amigable.
      console.error(`[analisis ${analisisId}] etapa "${etapa}" falló:`, error instanceof LLMError ? `${error.code} ${error.detalle ?? ""}` : error);
      emitir({ type: "stage", etapa, status: "error", message: mensaje });
      return mensaje;
    }
  }

  /** Reemplaza el diagrama por una versión corregida por el LLM tras un error de parseo en el cliente. */
  async repararDiagrama(analisisId: string, errorParser: string, tipo: TipoMermaid = "FLUJO") {
    const actual = await db.diagrama.findUnique({ where: { analisisId_tipo: { analisisId, tipo } } });
    if (!actual) return null;
    const corregido = await this.diagrama.reparar(actual.codigoMermaid, errorParser, tipo);
    return db.diagrama.update({
      where: { id: actual.id },
      data: { titulo: corregido.titulo, codigoMermaid: corregido.mermaid },
    });
  }
}

function tituloAutomatico(codigo: string, lenguaje: string): string {
  const primera = codigo
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !/^(\/\/|#|\/\*|\*|--|<!--)/.test(l));
  const base = (primera ?? "Código sin título").replace(/\s+/g, " ").slice(0, 60);
  return `${base} (${lenguaje})`;
}
