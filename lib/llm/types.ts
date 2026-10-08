/**
 * Capa de abstracción de proveedores LLM.
 * El resto de la app SOLO conoce esta interfaz: cambiar de Gemini a Groq (Fase 3)
 * es añadir una clase y cambiar LLM_PROVIDER, sin tocar generadores ni servicios.
 */

export interface LLMRequest {
  /** Instrucciones de sistema (rol, reglas, formato). */
  system: string;
  /** Mensaje del usuario (incluye el código a analizar dentro de delimitadores). */
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Pide al proveedor que responda en JSON (modo JSON nativo si existe). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface LLMResponse {
  text: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  /** Motivo de fin reportado por el proveedor (p. ej. STOP, MAX_TOKENS). */
  finishReason?: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export type LLMErrorCode =
  | "RATE_LIMIT" // límite del plan gratuito
  | "AUTH" // clave inválida o ausente
  | "CONFIG" // el modelo configurado no existe o no está disponible para esta clave
  | "UNAVAILABLE" // 5xx / sobrecarga
  | "TIMEOUT"
  | "BLOCKED" // filtro de seguridad del proveedor
  | "BAD_RESPONSE" // respuesta vacía o ilegible
  | "VALIDATION"; // el JSON no pasó el esquema tras los reintentos

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: LLMErrorCode,
    public readonly detalle?: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/** Mensaje seguro para mostrar al usuario (nunca incluye claves ni detalles internos). */
export function mensajeAmigable(error: unknown): string {
  if (error instanceof LLMError) {
    switch (error.code) {
      case "RATE_LIMIT":
        return "El proveedor de IA alcanzó su límite gratuito. Espera un minuto e inténtalo de nuevo.";
      case "AUTH":
        return "La clave del proveedor de IA no es válida o no está configurada en el servidor.";
      case "CONFIG":
        return "El modelo de IA configurado no existe o no está disponible para esta clave. Revisa GEMINI_MODEL o GROQ_MODEL.";
      case "UNAVAILABLE":
        return "El proveedor de IA está saturado en este momento. Inténtalo de nuevo en unos segundos.";
      case "TIMEOUT":
        return "La IA tardó demasiado en responder. Prueba con un fragmento de código más corto.";
      case "BLOCKED":
        return "El proveedor de IA bloqueó la solicitud por sus filtros de seguridad.";
      case "VALIDATION":
        return "La IA devolvió una respuesta con formato inválido varias veces seguidas. Inténtalo de nuevo.";
      default:
        return "La IA devolvió una respuesta que no pude interpretar. Inténtalo de nuevo.";
    }
  }
  return "Ocurrió un error inesperado al analizar el código.";
}
