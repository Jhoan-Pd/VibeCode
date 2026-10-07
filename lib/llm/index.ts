import "server-only";
import { GeminiProvider } from "./gemini";
import { LLMError, type LLMProvider } from "./types";

export * from "./types";
export { GeminiProvider } from "./gemini";

let instancia: LLMProvider | null = null;

/**
 * Fábrica del proveedor activo (LLM_PROVIDER). En la Fase 3 se añade "groq"
 * como respaldo sin tocar a quienes consumen la interfaz LLMProvider.
 */
export function getLLMProvider(): LLMProvider {
  if (instancia) return instancia;

  const nombre = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  switch (nombre) {
    case "gemini":
      instancia = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY ?? "",
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
        baseUrl: process.env.GEMINI_BASE_URL,
      });
      return instancia;
    default:
      throw new LLMError(`Proveedor LLM no soportado: ${nombre}`, "AUTH");
  }
}
