import type { AnalysisEvent } from "@/lib/analysis-events";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { hashCodigo } from "@/lib/hash";
import { mensajeLimite } from "@/lib/limites";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { AnalyzeRequestSchema } from "@/schemas/analysis";
import { AnalisisService, resolverMetadatos } from "@/services/analisis.service";
import { buscarEnCache, clonarAnalisis } from "@/services/cache.service";
import { consumir, devolver } from "@/services/limite.service";

// El análisis puede tardar: se amplía el tiempo máximo de la función y nunca se cachea.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CABECERAS_STREAM = {
  "content-type": "application/x-ndjson; charset=utf-8",
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
};

/**
 * POST /api/analyze  { codigo, lenguaje, nivel, titulo?, forzar? }
 * Responde con un stream NDJSON (una línea JSON por evento) para mostrar el progreso por etapas.
 * Orden de comprobaciones:
 *  1) sesión y esquema Zod,
 *  2) caché por hash (código + nivel): si existe, NO se llama al LLM ni se gasta cupo,
 *  3) límite diario (atómico en BD),
 *  4) análisis con el LLM (la API key solo existe aquí, en el servidor).
 */
export async function POST(req: Request) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;

  const body = await req.json().catch(() => null);
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400);
  }
  const input = parsed.data;

  // ---- 2) Caché ----
  if (!input.forzar) {
    const origen = await buscarEnCache(hashCodigo(input.codigo, input.nivel), sesion.userId);
    if (origen) {
      const id =
        origen.usuarioId === sesion.userId ? origen.id : (await clonarAnalisis(origen, sesion.userId, resolverMetadatos(input).titulo)).id;
      const eventos: AnalysisEvent[] = [
        { type: "start", analisisId: id },
        { type: "done", analisisId: id, estado: "COMPLETO", desdeCache: true },
      ];
      return new Response(eventos.map((e) => JSON.stringify(e)).join("\n") + "\n", { headers: CABECERAS_STREAM });
    }
  }

  // ---- 3) Límite diario ----
  let servicio: AnalisisService;
  try {
    servicio = new AnalisisService(getLLMProvider());
  } catch (e) {
    console.error("[analyze] proveedor LLM no disponible:", e);
    return jsonError(mensajeAmigable(e), 503);
  }

  const cupo = await consumir(sesion.userId, "analisis");
  if (!cupo.ok) return jsonError(mensajeLimite("analisis", cupo.limite), 429);

  // ---- 4) Análisis con el LLM ----
  const analisis = await servicio.crear(sesion.userId, input);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let abierto = true;
      const emitir = (evento: AnalysisEvent) => {
        if (!abierto) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(evento)}\n`));
        } catch {
          abierto = false; // el cliente cerró la conexión; el análisis sigue y se guarda igualmente
        }
      };

      emitir({ type: "start", analisisId: analisis.id });
      try {
        const estado = await servicio.ejecutar(analisis.id, emitir);
        // Si fallaron todas las etapas (p. ej. el proveedor de IA está caído), no se cobra el cupo.
        if (estado === "ERROR") await devolver(sesion.userId, "analisis").catch(() => {});
      } catch (e) {
        console.error("[analyze] fallo inesperado:", e);
        await db.analisis
          .update({ where: { id: analisis.id }, data: { estado: "ERROR", errorMensaje: mensajeAmigable(e) } })
          .catch(() => {});
        await devolver(sesion.userId, "analisis").catch(() => {});
        emitir({ type: "error", message: mensajeAmigable(e) });
      } finally {
        if (abierto) controller.close();
      }
    },
    cancel() {
      /* el cliente se desconectó: no abortamos, para que el resultado quede guardado en el historial */
    },
  });

  return new Response(stream, { headers: CABECERAS_STREAM });
}
