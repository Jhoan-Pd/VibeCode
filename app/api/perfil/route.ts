import { NextResponse } from "next/server";
import { conUsuario, leerCuerpo } from "@/lib/api";
import { PerfilSchema } from "@/schemas/auth";
import { actualizarPerfil } from "@/services/usuarios";

export const dynamic = "force-dynamic";

/** PATCH /api/perfil { nivel, nombre? } — actualiza el nivel que adapta las explicaciones. */
export const PATCH = conUsuario(async ({ req, usuarioId }) => {
  const cuerpo = await leerCuerpo(req, PerfilSchema);
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  return NextResponse.json(await actualizarPerfil(usuarioId, cuerpo.datos));
});
