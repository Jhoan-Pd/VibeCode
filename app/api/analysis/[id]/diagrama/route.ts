import { NextResponse } from "next/server";
import { z } from "zod";
import { conUsuario, jsonError, leerCuerpo, respuestaDeError } from "@/lib/api";
import { ErrorVisible } from "@/lib/errores";
import { mensajeLimite } from "@/lib/limites";
import { proveedorDisponible } from "@/lib/llm";
import { TIPOS_MERMAID } from "@/lib/mermaid";
import { AnalisisService } from "@/services/analisis.service";
import { conCupo } from "@/services/limite.service";
import { esAnalisisPropio } from "@/services/propiedad";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({ error: z.string().max(2000), tipo: z.enum(TIPOS_MERMAID).default("FLUJO") });

/**
 * POST /api/analysis/:id/diagrama { error, tipo? }
 * El cliente valida el Mermaid con mermaid.parse(); si falla, envía aquí el mensaje del parser
 * y el LLM devuelve una versión corregida que reemplaza a la guardada.
 */
export const POST = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const cuerpo = await leerCuerpo(req, Body, "Solicitud no válida");
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  if (!(await esAnalisisPropio(id, usuarioId))) return jsonError("Análisis no encontrado", 404);

  const llm = proveedorDisponible();
  if ("error" in llm) return jsonError(llm.error, 503);
  const servicio = new AnalisisService(llm.proveedor);

  try {
    const resultado = await conCupo(usuarioId, "consultas", async () => {
      const diagrama = await servicio.repararDiagrama(id, cuerpo.datos.error, cuerpo.datos.tipo);
      if (!diagrama) throw new ErrorVisible("Este análisis no tiene ese diagrama", 404);
      return diagrama;
    });
    if (resultado.agotado) return jsonError(mensajeLimite("consultas", resultado.limite), 429);
    return NextResponse.json({ titulo: resultado.valor.titulo, mermaid: resultado.valor.codigoMermaid });
  } catch (e) {
    return respuestaDeError(e);
  }
});
