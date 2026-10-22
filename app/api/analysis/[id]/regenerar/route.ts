import { NextResponse } from "next/server";
import { conUsuario, jsonError, leerCuerpo, respuestaDeError } from "@/lib/api";
import { ErrorVisible } from "@/lib/errores";
import { mensajeLimite } from "@/lib/limites";
import { proveedorDisponible } from "@/lib/llm";
import { RegenerarRequestSchema } from "@/schemas/analysis";
import { AnalisisService } from "@/services/analisis.service";
import { conCupo } from "@/services/limite.service";
import { esAnalisisPropio } from "@/services/propiedad";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/analysis/:id/regenerar { etapa } — reintenta una sola etapa o genera un quiz nuevo.
 * Cuenta como consulta secundaria a la IA (límite diario DAILY_AI_QUERIES_LIMIT); si falla, se devuelve.
 */
export const POST = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const cuerpo = await leerCuerpo(req, RegenerarRequestSchema, "Etapa no válida");
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  if (!(await esAnalisisPropio(id, usuarioId))) return jsonError("Análisis no encontrado", 404);

  const llm = proveedorDisponible();
  if ("error" in llm) return jsonError(llm.error, 503);
  const servicio = new AnalisisService(llm.proveedor);

  try {
    const resultado = await conCupo(usuarioId, "consultas", async () => {
      const error = await servicio.regenerarEtapa(id, cuerpo.datos.etapa);
      if (error) throw new ErrorVisible(error, 502);
    });
    if (resultado.agotado) return jsonError(mensajeLimite("consultas", resultado.limite), 429);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e);
  }
});
