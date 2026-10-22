import type { AnalysisEvent } from "@/lib/analysis-events";
import { conUsuario, jsonError, leerCuerpo } from "@/lib/api";
import { db } from "@/lib/db";
import { hashCodigo } from "@/lib/hash";
import { mensajeLimite } from "@/lib/limites";
import { mensajeAmigable, proveedorDisponible } from "@/lib/llm";
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
/** Respuesta NDJSON ya completa (resultado desde la caché: no hay nada que esperar). */
function respuestaNdjson(eventos: AnalysisEvent[]) {
  return new Response(eventos.map((e) => JSON.stringify(e)).join("\n") + "\n", { headers: CABECERAS_STREAM });
}

export const POST = conUsuario(async ({ req, usuarioId }) => {
  const cuerpo = await leerCuerpo(req, AnalyzeRequestSchema);
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  const input = cuerpo.datos;

  // ---- 2) Caché ----
  if (!input.forzar) {
    const origen = await buscarEnCache(hashCodigo(input.codigo, input.nivel), usuarioId);
    if (origen) {
      const id = origen.usuarioId === usuarioId ? origen.id : (await clonarAnalisis(origen, usuarioId, resolverMetadatos(input).titulo)).id;
      return respuestaNdjson([
        { type: "start", analisisId: id },
        { type: "done", analisisId: id, estado: "COMPLETO", desdeCache: true },
      ]);
    }
  }

  // ---- 3) Límite diario ----
  const llm = proveedorDisponible();
  if ("error" in llm) return jsonError(llm.error, 503);
  const servicio = new AnalisisService(llm.proveedor);

  // Aquí no sirve conCupo: el análisis sigue dentro del stream, después de responder.
  const cupo = await consumir(usuarioId, "analisis");
  if (!cupo.ok) return jsonError(mensajeLimite("analisis", cupo.limite), 429);

  // ---- 4) Análisis con el LLM ----
  const analisis = await servicio.crear(usuarioId, input);

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
        if (estado === "ERROR") await devolver(usuarioId, "analisis").catch(() => {});
      } catch (e) {
        console.error("[analyze] fallo inesperado:", e);
        await db.analisis
          .update({ where: { id: analisis.id }, data: { estado: "ERROR", errorMensaje: mensajeAmigable(e) } })
          .catch(() => {});
        await devolver(usuarioId, "analisis").catch(() => {});
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
});
