import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { RegisterSchema } from "@/schemas/auth";
import { EmailEnUsoError, registrarUsuario } from "@/services/usuarios";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos no válidos", 400);
  }
  try {
    const usuario = await registrarUsuario(parsed.data);
    return NextResponse.json({ ok: true, id: usuario.id }, { status: 201 });
  } catch (e) {
    if (e instanceof EmailEnUsoError) return jsonError("Ya existe una cuenta con ese correo", 409);
    console.error("[register]", e);
    return jsonError("No se pudo crear la cuenta. Inténtalo de nuevo.", 500);
  }
}
