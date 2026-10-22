import { NextResponse } from "next/server";
import { jsonError, leerCuerpo } from "@/lib/api";
import { RegisterSchema } from "@/schemas/auth";
import { EmailEnUsoError, registrarUsuario } from "@/services/usuarios";

export const dynamic = "force-dynamic";

/** POST /api/register { nombre, email, password } — crea una cuenta con correo y contraseña (ruta pública). */
export async function POST(req: Request) {
  const cuerpo = await leerCuerpo(req, RegisterSchema);
  if ("respuesta" in cuerpo) return cuerpo.respuesta;
  try {
    const usuario = await registrarUsuario(cuerpo.datos);
    return NextResponse.json({ ok: true, id: usuario.id }, { status: 201 });
  } catch (e) {
    if (e instanceof EmailEnUsoError) return jsonError("Ya existe una cuenta con ese correo", 409);
    console.error("[register]", e);
    return jsonError("No se pudo crear la cuenta. Inténtalo de nuevo.", 500);
  }
}
