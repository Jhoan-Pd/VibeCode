import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { ProveedorConRespaldo } from "./respaldo";
import { LLMError, type LLMProvider } from "./types";

type Entorno = Record<string, string | undefined>;
type NombreProveedor = "gemini" | "groq";

export const MODELO_GEMINI_POR_DEFECTO = "gemini-3.5-flash-lite";
export const MODELO_GROQ_POR_DEFECTO = "openai/gpt-oss-20b";

/** Crea un proveedor si su clave existe; null si no está configurado. */
function crear(nombre: NombreProveedor, env: Entorno): LLMProvider | null {
  if (nombre === "gemini") {
    if (!env.GEMINI_API_KEY) return null;
    return new GeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || MODELO_GEMINI_POR_DEFECTO, baseUrl: env.GEMINI_BASE_URL });
  }
  if (!env.GROQ_API_KEY) return null;
  return new GroqProvider({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL || MODELO_GROQ_POR_DEFECTO, baseUrl: env.GROQ_BASE_URL });
}

function nombreValido(valor: string | undefined, porDefecto: NombreProveedor | "none"): NombreProveedor | "none" {
  const v = (valor ?? porDefecto).trim().toLowerCase();
  if (v === "gemini" || v === "groq" || v === "none") return v;
  throw new LLMError(`Proveedor LLM no soportado: ${v}`, "AUTH");
}

/**
 * Decide el proveedor según las variables de entorno:
 *  - LLM_PROVIDER: principal (gemini por defecto).
 *  - LLM_FALLBACK: respaldo (por defecto, el otro proveedor si tiene clave; "none" lo desactiva).
 * Si el principal no tiene clave pero el respaldo sí, se usa solo el respaldo.
 */
export function crearProveedorDesdeEntorno(env: Entorno): LLMProvider {
  const nombrePrincipal = nombreValido(env.LLM_PROVIDER, "gemini");
  if (nombrePrincipal === "none") throw new LLMError("LLM_PROVIDER no puede ser 'none'", "AUTH");
  const otro: NombreProveedor = nombrePrincipal === "gemini" ? "groq" : "gemini";
  const nombreRespaldo = nombreValido(env.LLM_FALLBACK, otro);

  const principal = crear(nombrePrincipal, env);
  const respaldo = nombreRespaldo === "none" || nombreRespaldo === nombrePrincipal ? null : crear(nombreRespaldo, env);

  if (principal && respaldo) return new ProveedorConRespaldo(principal, respaldo);
  if (principal) return principal;
  if (respaldo) return respaldo;
  throw new LLMError(
    `Falta la clave del proveedor de IA (${nombrePrincipal === "gemini" ? "GEMINI_API_KEY" : "GROQ_API_KEY"}) en las variables de entorno del servidor.`,
    "AUTH",
  );
}
