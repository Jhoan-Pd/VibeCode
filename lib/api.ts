import "server-only";
import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import { auth } from "@/auth";
import { ErrorVisible } from "@/lib/errores";
import { mensajeAmigable } from "@/lib/llm/types";

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

/** Lo que recibe un handler envuelto con `conUsuario`. */
export interface ContextoRuta<P> {
  req: Request;
  usuarioId: string;
  params: P;
}

/**
 * Decorador de route handlers: comprueba la sesión, resuelve los parámetros dinámicos y convierte
 * cualquier excepción no prevista en un 500 con mensaje genérico (el detalle queda en el log, nunca
 * en la respuesta). Así cada ruta solo contiene su lógica, sin repetir el mismo prólogo.
 */
export function conUsuario<P extends Record<string, string> = Record<string, never>>(
  handler: (ctx: ContextoRuta<P>) => Promise<Response>,
) {
  return async (req: Request, segmento: { params: Promise<P> }): Promise<Response> => {
    const sesion = await requerirUsuario();
    if ("respuesta" in sesion) return sesion.respuesta;
    const params = (await segmento?.params) ?? ({} as P);
    try {
      return await handler({ req, usuarioId: sesion.userId, params });
    } catch (e) {
      console.error(`[${req.method} ${new URL(req.url).pathname}]`, e);
      return jsonError("Ocurrió un error inesperado en el servidor. Inténtalo de nuevo.", 500);
    }
  };
}

/**
 * Lee el cuerpo JSON y lo valida con Zod. Devuelve los datos tipados o una respuesta 400 con el
 * primer mensaje del esquema (o `mensaje` si se prefiere uno fijo).
 */
export async function leerCuerpo<T>(req: Request, esquema: ZodType<T, ZodTypeDef, unknown>, mensaje?: string): Promise<{ datos: T } | { respuesta: NextResponse }> {
  const parsed = esquema.safeParse(await req.json().catch(() => null));
  if (parsed.success) return { datos: parsed.data };
  return { respuesta: jsonError(mensaje ?? parsed.error.issues[0]?.message ?? "Datos no válidos", 400) };
}

/**
 * Respuesta para un error capturado en una ruta: los `ErrorVisible` conservan su mensaje y su
 * código; los errores del LLM se traducen con `mensajeAmigable`; el resto se registra en el log.
 */
export function respuestaDeError(e: unknown, statusPorDefecto = 502) {
  if (e instanceof ErrorVisible) return jsonError(e.message, e.status);
  console.error("[api]", e);
  return jsonError(mensajeAmigable(e), statusPorDefecto);
}
