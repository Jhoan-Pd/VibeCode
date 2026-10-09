import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { urlPublica } from "@/lib/compartir";
import { activarEnlace, desactivarEnlace } from "@/services/compartir.service";

export const dynamic = "force-dynamic";

/** POST /api/analysis/:id/compartir — crea (o devuelve) el enlace público de solo lectura. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const token = await activarEnlace(id, sesion.userId);
  if (!token) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ token, url: urlPublica(new URL(req.url).origin, token) });
}

/** DELETE /api/analysis/:id/compartir — revoca el enlace público. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  if (!(await desactivarEnlace(id, sesion.userId))) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ ok: true });
}
