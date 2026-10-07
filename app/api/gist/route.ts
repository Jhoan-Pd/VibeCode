import { NextResponse } from "next/server";
import { jsonError, requerirUsuario } from "@/lib/api";
import { detectLanguage, languageFromFilename } from "@/lib/language";

export const dynamic = "force-dynamic";

// SSRF: solo se aceptan URLs de gist.github.com con un id hexadecimal; el host al que llamamos es fijo.
const GIST_URL = /^https:\/\/gist\.github\.com\/(?:[\w-]+\/)?([a-f0-9]{20,40})(?:[/?#].*)?$/i;
const MAX_ARCHIVOS = 5;

interface GistFile {
  filename: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
  size?: number;
}

/** GET /api/gist?url=https://gist.github.com/usuario/<id> — trae los archivos de un Gist público. */
export async function GET(req: Request) {
  const sesion = await requerirUsuario();
  if ("respuesta" in sesion) return sesion.respuesta;

  const url = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  const m = url.match(GIST_URL);
  if (!m) return jsonError("Pega la URL de un Gist público, por ejemplo https://gist.github.com/usuario/abc123…", 400);

  const headers: Record<string, string> = { accept: "application/vnd.github+json", "user-agent": "VibeDecoder" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/gists/${m[1]}`, { headers, signal: AbortSignal.timeout(10_000) });
  } catch {
    return jsonError("No se pudo contactar a GitHub. Inténtalo de nuevo.", 502);
  }
  if (res.status === 404) return jsonError("No se encontró ese Gist (¿es privado o la URL es incorrecta?).", 404);
  if (res.status === 403 || res.status === 429) {
    return jsonError("GitHub limitó las consultas anónimas. Espera unos minutos o pega el código directamente.", 429);
  }
  if (!res.ok) return jsonError("GitHub no pudo entregar el Gist.", 502);

  const data = (await res.json()) as { files?: Record<string, GistFile> };
  const archivos: { nombre: string; lenguaje: string; contenido: string }[] = [];

  for (const f of Object.values(data.files ?? {}).slice(0, MAX_ARCHIVOS)) {
    let contenido = f.content ?? "";
    if (f.truncated && f.raw_url) {
      try {
        const raw = new URL(f.raw_url);
        // Solo seguimos URLs crudas del dominio oficial de Gist.
        if (raw.protocol === "https:" && raw.hostname === "gist.githubusercontent.com") {
          const r = await fetch(raw, { signal: AbortSignal.timeout(10_000) });
          if (r.ok) contenido = await r.text();
        }
      } catch {
        /* se deja el contenido truncado */
      }
    }
    if (!contenido || contenido.includes("\u0000")) continue; // vacío o binario
    archivos.push({
      nombre: f.filename,
      lenguaje: languageFromFilename(f.filename) ?? detectLanguage(contenido, f.filename),
      contenido,
    });
  }

  if (archivos.length === 0) return jsonError("El Gist no contiene archivos de texto legibles.", 422);
  return NextResponse.json({ archivos });
}
