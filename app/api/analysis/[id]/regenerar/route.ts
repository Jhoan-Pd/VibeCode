import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { mensajeLimite } from "@/lib/limites";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { RegenerarRequestSchema } from "@/schemas/analysis";
import { AnalisisService } from "@/services/analisis.service";
import { consumir, devolver } from "@/services/limite.service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/analysis/:id/regenerar { etapa } — reintenta una sola etapa o genera un quiz nuevo.
 * Cuenta como consulta secundaria a la IA (límite diario DAILY_AI_QUERIES_LIMIT).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const parsed = RegenerarRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Etapa no válida", 400);

  const propio = await db.analisis.findFirst({ where: { id, usuarioId: sesion.userId }, select: { id: true } });
  if (!propio) return jsonError("Análisis no encontrado", 404);

  let servicio: AnalisisService;
  try {
    servicio = new AnalisisService(getLLMProvider());
  } catch (e) {
    return jsonError(mensajeAmigable(e), 503);
  }

  const cupo = await consumir(sesion.userId, "consultas");
  if (!cupo.ok) return jsonError(mensajeLimite("consultas", cupo.limite), 429);

  const error = await servicio.regenerarEtapa(id, parsed.data.etapa);
  if (error) {
    await devolver(sesion.userId, "consultas").catch(() => {});
    return jsonError(error, 502);
  }
  return NextResponse.json({ ok: true });
}
