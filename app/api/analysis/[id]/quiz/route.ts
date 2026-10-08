import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { IntentoRequestSchema } from "@/schemas/quiz";
import { registrarIntento } from "@/services/quiz.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/analysis/:id/quiz { quizId, respuestas: [{ preguntaId, respuesta }] }
 * Califica el intento en el servidor, lo guarda y devuelve el resultado con la
 * retroalimentación por pregunta y las líneas a repasar si sacó menos del 70 %.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;
  const { id } = await params;

  const parsed = IntentoRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Respuestas no válidas", 400);

  const resultado = await registrarIntento(id, sesion.userId, parsed.data);
  if (!resultado) return jsonError("Quiz no encontrado", 404);
  return NextResponse.json(resultado);
}
