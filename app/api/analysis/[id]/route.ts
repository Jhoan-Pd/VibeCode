import { NextResponse } from "next/server";
import { conUsuario, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** DELETE /api/analysis/:id — borra un análisis propio (cascada a explicaciones, diagramas, etc.). */
export const DELETE = conUsuario<{ id: string }>(async ({ usuarioId, params: { id } }) => {
  // El filtro por usuarioId garantiza que nadie borre análisis ajenos.
  const { count } = await db.analisis.deleteMany({ where: { id, usuarioId } });
  if (count === 0) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ ok: true });
});
