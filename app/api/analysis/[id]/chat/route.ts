import { NextResponse } from "next/server";
import { conUsuario, jsonError, leerCuerpo, respuestaDeError } from "@/lib/api";
import { ErrorVisible } from "@/lib/errores";
import { mensajeLimite } from "@/lib/limites";
import { proveedorDisponible } from "@/lib/llm";
import { ChatRequestSchema } from "@/schemas/chat";
import { borrarConversacion, listarMensajes, responder } from "@/services/chat.service";
import { conCupo } from "@/services/limite.service";
import { esAnalisisPropio } from "@/services/propiedad";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const NO_ENCONTRADO = "Análisis no encontrado";

/** GET /api/analysis/:id/chat — conversación del usuario sobre este análisis. */
export const GET = conUsuario<{ id: string }>(async ({ usuarioId, params: { id } }) => {
  if (!(await esAnalisisPropio(id, usuarioId))) return jsonError(NO_ENCONTRADO, 404);
  return NextResponse.json({ mensajes: await listarMensajes(id, usuarioId) });
});

/** POST /api/analysis/:id/chat { mensaje, lineaInicio?, lineaFin? } — pregunta sobre un fragmento. */
export const POST = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const cuerpo = await leerCuerpo(req, ChatRequestSchema);
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  if (!(await esAnalisisPropio(id, usuarioId))) return jsonError(NO_ENCONTRADO, 404);

  const llm = proveedorDisponible();
  if ("error" in llm) return jsonError(llm.error, 503);

  try {
    const resultado = await conCupo(usuarioId, "consultas", async () => {
      const mensajes = await responder(llm.proveedor, id, usuarioId, cuerpo.datos);
      if (!mensajes) throw new ErrorVisible(NO_ENCONTRADO, 404);
      return mensajes;
    });
    if (resultado.agotado) return jsonError(mensajeLimite("consultas", resultado.limite), 429);
    return NextResponse.json({ mensajes: resultado.valor, restantes: resultado.restantes });
  } catch (e) {
    return respuestaDeError(e);
  }
});

/** DELETE /api/analysis/:id/chat — borra la conversación. */
export const DELETE = conUsuario<{ id: string }>(async ({ usuarioId, params: { id } }) => {
  if (!(await esAnalisisPropio(id, usuarioId))) return jsonError(NO_ENCONTRADO, 404);
  await borrarConversacion(id, usuarioId);
  return NextResponse.json({ ok: true });
});
