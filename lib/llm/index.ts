import "server-only";
import { crearProveedorDesdeEntorno } from "./fabrica";
import { mensajeAmigable, type LLMProvider } from "./types";

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

/**
 * Variante de `getLLMProvider` para las rutas: en lugar de lanzar cuando falta la clave o la
 * configuración es inválida, devuelve el mensaje amigable para responder 503.
 */
export function proveedorDisponible(): { proveedor: LLMProvider } | { error: string } {
  try {
    return { proveedor: getLLMProvider() };
  } catch (e) {
    console.error("[llm] proveedor no disponible:", e);
    return { error: mensajeAmigable(e) };
  }
}
