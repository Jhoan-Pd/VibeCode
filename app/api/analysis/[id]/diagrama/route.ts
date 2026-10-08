import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";
import { mensajeLimite } from "@/lib/limites";
import { getLLMProvider, mensajeAmigable } from "@/lib/llm";
import { AnalisisService } from "@/services/analisis.service";
import { consumir, devolver } from "@/services/limite.service";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Body = z.object({ error: z.string().max(2000), tipo: z.enum(["FLUJO", "CLASES", "SECUENCIA"]).default("FLUJO") });

/**
 * POST /api/analysis/:id/diagrama { error, tipo? }
 * El cliente valida el Mermaid con mermaid.parse(); si falla, envía aquí el mensaje del parser
 * y el LLM devuelve una versión corregida que reemplaza a la guardada.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Solicitud no válida", 400);

  const propio = await db.analisis.findFirst({ where: { id, usuarioId: sesion.userId }, select: { id: true } });
  if (!propio) return jsonError("Análisis no encontrado", 404);

  const cupo = await consumir(sesion.userId, "consultas");
  if (!cupo.ok) return jsonError(mensajeLimite("consultas", cupo.limite), 429);

  try {
    const servicio = new AnalisisService(getLLMProvider());
    const diagrama = await servicio.repararDiagrama(id, parsed.data.error, parsed.data.tipo);
    if (!diagrama) return jsonError("Este análisis no tiene ese diagrama", 404);
    return NextResponse.json({ titulo: diagrama.titulo, mermaid: diagrama.codigoMermaid });
  } catch (e) {
    await devolver(sesion.userId, "consultas").catch(() => {});
    return jsonError(mensajeAmigable(e), 502);
  }
}
