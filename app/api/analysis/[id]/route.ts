import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** DELETE /api/analysis/:id — borra un análisis propio (cascada a explicaciones, diagramas, etc.). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  // El filtro por usuarioId garantiza que nadie borre análisis ajenos.
  const { count } = await db.analisis.deleteMany({ where: { id, usuarioId: sesion.userId } });
  if (count === 0) return jsonError("Análisis no encontrado", 404);
  return NextResponse.json({ ok: true });
}
