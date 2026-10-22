import { NextResponse } from "next/server";
import { conUsuario, respuestaDeError } from "@/lib/api";
import { obtenerArchivosGist } from "@/services/gist.service";

export const dynamic = "force-dynamic";

/** GET /api/gist?url=https://gist.github.com/usuario/<id> — trae los archivos de un Gist público. */
export const GET = conUsuario(async ({ req }) => {
  try {
    const archivos = await obtenerArchivosGist(new URL(req.url).searchParams.get("url") ?? "");
    return NextResponse.json({ archivos });
  } catch (e) {
    return respuestaDeError(e);
  }
});
