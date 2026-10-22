import { NextResponse } from "next/server";
import { conUsuario, jsonError, leerCuerpo } from "@/lib/api";
import { IntentoRequestSchema } from "@/schemas/quiz";
import { registrarIntento } from "@/services/quiz.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/analysis/:id/quiz { quizId, respuestas: [{ preguntaId, respuesta }] }
 * Califica el intento en el servidor, lo guarda y devuelve el resultado con la
 * retroalimentación por pregunta y las líneas a repasar si sacó menos del 70 %.
 */
export const POST = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const cuerpo = await leerCuerpo(req, IntentoRequestSchema, "Respuestas no válidas");
  if ("respuesta" in cuerpo) return cuerpo.respuesta;

  const resultado = await registrarIntento(id, usuarioId, cuerpo.datos);
  if (!resultado) return jsonError("Quiz no encontrado", 404);
  return NextResponse.json(resultado);
});
