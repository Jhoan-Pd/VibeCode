import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export function jsonError(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

/**
 * Comprueba la sesión dentro de cada API route (el middleware es la primera barrera,
 * pero nunca la única). Devuelve el id de usuario o una Response 401 lista para retornar.
 */
export async function requerirUsuario(): Promise<{ userId: string } | { respuesta: NextResponse }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { respuesta: jsonError("No autorizado. Inicia sesión.", 401) };
  return { userId };
}
