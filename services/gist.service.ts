import "server-only";
import { ErrorVisible } from "@/lib/errores";
import { extraerIdGist } from "@/lib/gist";
import { detectLanguage, languageFromFilename } from "@/lib/language";

const MAX_ARCHIVOS = 5;
const TIEMPO_MAXIMO_MS = 10_000;

interface ArchivoApiGist {
  filename: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

export interface ArchivoGist {
  nombre: string;
  lenguaje: string;
  contenido: string;
}

/**
 * Trae los archivos de texto de un Gist público. El host consultado es fijo (api.github.com) y
 * los archivos truncados solo se completan desde gist.githubusercontent.com (anti-SSRF).
 * Los problemas esperables se lanzan como ErrorVisible con su código HTTP.
 */
export async function obtenerArchivosGist(url: string, token = process.env.GITHUB_TOKEN): Promise<ArchivoGist[]> {
  const id = extraerIdGist(url);
  if (!id) throw new ErrorVisible("Pega la URL de un Gist público, por ejemplo https://gist.github.com/usuario/abc123…", 400);

  const headers: Record<string, string> = { accept: "application/vnd.github+json", "user-agent": "VibeDecoder" };
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/gists/${id}`, { headers, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
  } catch {
    throw new ErrorVisible("No se pudo contactar a GitHub. Inténtalo de nuevo.", 502);
  }
  if (res.status === 404) throw new ErrorVisible("No se encontró ese Gist (¿es privado o la URL es incorrecta?).", 404);
  if (res.status === 403 || res.status === 429) {
    throw new ErrorVisible("GitHub limitó las consultas anónimas. Espera unos minutos o pega el código directamente.", 429);
  }
  if (!res.ok) throw new ErrorVisible("GitHub no pudo entregar el Gist.", 502);

  const data = (await res.json()) as { files?: Record<string, ArchivoApiGist> };
  const archivos: ArchivoGist[] = [];
  for (const f of Object.values(data.files ?? {}).slice(0, MAX_ARCHIVOS)) {
    const contenido = await contenidoCompleto(f);
    if (!contenido || contenido.includes("\u0000")) continue; // vacío o binario
    archivos.push({ nombre: f.filename, lenguaje: languageFromFilename(f.filename) ?? detectLanguage(contenido, f.filename), contenido });
  }
  if (archivos.length === 0) throw new ErrorVisible("El Gist no contiene archivos de texto legibles.", 422);
  return archivos;
}

/** La API corta los archivos grandes: en ese caso se pide el texto crudo, solo al dominio oficial. */
async function contenidoCompleto(f: ArchivoApiGist): Promise<string> {
  const contenido = f.content ?? "";
  if (!f.truncated || !f.raw_url) return contenido;
  try {
    const raw = new URL(f.raw_url);
    if (raw.protocol !== "https:" || raw.hostname !== "gist.githubusercontent.com") return contenido;
    const r = await fetch(raw, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
    return r.ok ? await r.text() : contenido;
  } catch {
    return contenido; // se deja el contenido truncado
  }
}
