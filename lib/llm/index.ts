import "server-only";
import { crearProveedorDesdeEntorno } from "./fabrica";
import type { LLMProvider } from "./types";

export * from "./types";
export { GeminiProvider } from "./gemini";
export { GroqProvider } from "./groq";
export { ProveedorConRespaldo } from "./respaldo";

let instancia: LLMProvider | null = null;

/**
 * Proveedor activo (Gemini con Groq de respaldo por defecto). Quien lo usa solo conoce la
 * interfaz LLMProvider: cambiar o combinar proveedores no toca generadores ni servicios.
 */
export function getLLMProvider(): LLMProvider {
  instancia ??= crearProveedorDesdeEntorno(process.env);
  return instancia;
}
