import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { generarTokenPublico } from "@/lib/compartir";
import { db } from "@/lib/db";

/**
 * Activa el enlace público de un análisis propio. Si ya estaba compartido devuelve el mismo token
 * (el enlace que el usuario ya envió sigue funcionando). Devuelve null si el análisis no es suyo.
 */
export async function activarEnlace(analisisId: string, usuarioId: string): Promise<string | null> {
  const actual = await db.analisis.findFirst({ where: { id: analisisId, usuarioId }, select: { tokenPublico: true } });
  if (!actual) return null;
  if (actual.tokenPublico) return actual.tokenPublico;

  // Colisión prácticamente imposible (192 bits), pero la restricción UNIQUE la detectaría: se reintenta.
  for (let intento = 0; intento < 3; intento++) {
    const token = generarTokenPublico();
    try {
      await db.analisis.update({ where: { id: analisisId }, data: { tokenPublico: token } });
      return token;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("No se pudo generar un enlace único");
}

/** Revoca el enlace: el token se borra y la URL anterior deja de funcionar para siempre. */
export async function desactivarEnlace(analisisId: string, usuarioId: string): Promise<boolean> {
  const { count } = await db.analisis.updateMany({ where: { id: analisisId, usuarioId }, data: { tokenPublico: null } });
  return count > 0;
}
