import "server-only";
import { db } from "@/lib/db";

/**
 * ¿El análisis existe y pertenece a este usuario? Toda ruta que actúa sobre un análisis lo
 * comprueba primero: si no es suyo responde 404 (no 403), para no revelar que existe.
 */
export async function esAnalisisPropio(analisisId: string, usuarioId: string): Promise<boolean> {
  return (await db.analisis.count({ where: { id: analisisId, usuarioId } })) > 0;
}
