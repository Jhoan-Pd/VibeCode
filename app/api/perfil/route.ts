import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { PerfilSchema } from "@/schemas/auth";
import { actualizarPerfil } from "@/services/usuarios";

export const dynamic = "force-dynamic";

/** PATCH /api/perfil { nivel, nombre? } — actualiza el nivel que adapta las explicaciones. */
export async function PATCH(req: Request) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;

  const parsed = PerfilSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400);

  const usuario = await actualizarPerfil(sesion.userId, parsed.data);
  return NextResponse.json(usuario);
}
