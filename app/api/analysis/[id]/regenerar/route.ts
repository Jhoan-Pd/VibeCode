import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { RegenerarRequestSchema } from "@/schemas/analysis";
import { AnalisisService } from "@/services/analisis.service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** POST /api/analysis/:id/regenerar { etapa } — reintenta una sola etapa (resumen | lineas | diagrama). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const parsed = RegenerarRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Etapa no válida", 400);

  const propio = await db.analisis.findFirst({ where: { id, usuarioId: sesion.userId }, select: { id: true } });
  if (!propio) return jsonError("Análisis no encontrado", 404);

  try {
    const servicio = new AnalisisService(getLLMProvider());
    const error = await servicio.regenerarEtapa(id, parsed.data.etapa);
    if (error) return jsonError(error, 502);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(mensajeAmigable(e), 503);
  }
}
