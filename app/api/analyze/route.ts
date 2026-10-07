import type { AnalysisEvent } from "@/lib/analysis-events";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { AnalyzeRequestSchema } from "@/schemas/analysis";
import { AnalisisService } from "@/services/analisis.service";

// El análisis puede tardar: se amplía el tiempo máximo de la función y nunca se cachea.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/analyze  { codigo, lenguaje, nivel, titulo? }
 * Responde con un stream NDJSON (una línea JSON por evento) para mostrar el progreso por etapas.
 * La API key del LLM se usa solo aquí, en el servidor.
 */
export async function POST(req: Request) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;

  const body = await req.json().catch(() => null);
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400);
  }

  let servicio: AnalisisService;
  try {
    servicio = new AnalisisService(getLLMProvider());
  } catch (e) {
    console.error("[analyze] proveedor LLM no disponible:", e);
    return jsonError(mensajeAmigable(e), 503);
  }

  const analisis = await servicio.crear(sesion.userId, parsed.data);

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
        await servicio.ejecutar(analisis.id, emitir);
      } catch (e) {
        console.error("[analyze] fallo inesperado:", e);
        await db.analisis
          .update({ where: { id: analisis.id }, data: { estado: "ERROR", errorMensaje: mensajeAmigable(e) } })
          .catch(() => {});
        emitir({ type: "error", message: mensajeAmigable(e) });
      } finally {
        if (abierto) controller.close();
      }
    },
    cancel() {
      /* el cliente se desconectó: no abortamos, para que el resultado quede guardado en el historial */
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
