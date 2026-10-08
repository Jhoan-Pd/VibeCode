import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { mensajeLimite } from "@/lib/limites";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { ChatRequestSchema } from "@/schemas/chat";
import { borrarConversacion, listarMensajes, responder } from "@/services/chat.service";
import { consumir, devolver } from "@/services/limite.service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function esPropio(id: string, usuarioId: string) {
  return (await db.analisis.count({ where: { id, usuarioId } })) > 0;
}

/** GET /api/analysis/:id/chat — conversación del usuario sobre este análisis. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;
  if (!(await esPropio(id, sesion.userId))) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ mensajes: await listarMensajes(id, sesion.userId) });
}

/** POST /api/analysis/:id/chat { mensaje, lineaInicio?, lineaFin? } — pregunta sobre un fragmento. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const parsed = ChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Mensaje no válido", 400);
  if (!(await esPropio(id, sesion.userId))) return jsonError("Análisis no encontrado", 404);

  let provider;
  try {
    provider = getLLMProvider();
  } catch (e) {
    return jsonError(mensajeAmigable(e), 503);
  }

  const cupo = await consumir(sesion.userId, "consultas");
  if (!cupo.ok) return jsonError(mensajeLimite("consultas", cupo.limite), 429);

  try {
    const mensajes = await responder(provider, id, sesion.userId, parsed.data);
    if (!mensajes) return jsonError("Análisis no encontrado", 404);
    return NextResponse.json({ mensajes, restantes: cupo.restantes });
  } catch (e) {
    console.error(`[chat ${id}]`, e);
    await devolver(sesion.userId, "consultas").catch(() => {});
    return jsonError(mensajeAmigable(e), 502);
  }
}

/** DELETE /api/analysis/:id/chat — borra la conversación. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;
  if (!(await esPropio(id, sesion.userId))) return jsonError("Análisis no encontrado", 404);
  await borrarConversacion(id, sesion.userId);
  return NextResponse.json({ ok: true });
}
