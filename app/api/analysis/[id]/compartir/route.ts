import { NextResponse } from "next/server";
import { conUsuario, jsonError } from "@/lib/api";
import { urlPublica } from "@/lib/compartir";
import { activarEnlace, desactivarEnlace } from "@/services/compartir.service";

export const dynamic = "force-dynamic";

/** POST /api/analysis/:id/compartir — crea (o devuelve) el enlace público de solo lectura. */
export const POST = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const token = await activarEnlace(id, usuarioId);
  if (!token) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ token, url: urlPublica(new URL(req.url).origin, token) });
});

/** DELETE /api/analysis/:id/compartir — revoca el enlace público. */
export const DELETE = conUsuario<{ id: string }>(async ({ usuarioId, params: { id } }) => {
  if (!(await desactivarEnlace(id, usuarioId))) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ ok: true });
});
