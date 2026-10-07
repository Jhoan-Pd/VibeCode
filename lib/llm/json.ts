import type { ZodType, ZodTypeDef } from "zod";
import { LLMError, type LLMProvider } from "./types";

export interface GenerateJsonOptions<T> {
  provider: LLMProvider;
  system: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  /** Validación semántica extra (rangos de líneas, etc.). Devuelve una lista de problemas; vacía = OK. */
  validate?: (data: T) => string[];
  /** Reintentos tras el primer intento (por defecto 2, como pide la especificación). */
  maxRetries?: number;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Extrae el primer objeto JSON de un texto (quita ```json ... ``` y texto alrededor). */
export function extraerJson(texto: string): string {
  let t = texto.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const inicio = t.indexOf("{");
  const fin = t.lastIndexOf("}");
  if (inicio !== -1 && fin > inicio) return t.slice(inicio, fin + 1);
  return t;
}

/**
 * Pide JSON estricto al LLM, lo valida con Zod (+ validación semántica opcional) y,
 * si falla, reintenta incluyendo el error concreto en el prompt.
 * Los errores de proveedor (límite, clave, timeout) NO se reintentan aquí: no los arregla un nuevo prompt.
 */
export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<{ data: T; intentos: number }> {
  const maxRetries = opts.maxRetries ?? 2;
  let prompt = opts.prompt;
  let ultimoProblema = "";

  for (let intento = 0; intento <= maxRetries; intento++) {
    const respuesta = await opts.provider.generate({
      system: opts.system,
      prompt,
      json: true,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    });

    const problemas: string[] = [];
    let candidato: unknown;
    try {
      candidato = JSON.parse(extraerJson(respuesta.text));
    } catch {
      problemas.push(
        respuesta.finishReason === "MAX_TOKENS"
          ? "La respuesta se cortó por longitud y el JSON quedó incompleto. Sé más conciso."
          : "La respuesta no es JSON válido.",
      );
    }

    if (problemas.length === 0) {
      const parsed = opts.schema.safeParse(candidato);
      if (parsed.success) {
        const extra = opts.validate?.(parsed.data) ?? [];
        if (extra.length === 0) return { data: parsed.data, intentos: intento + 1 };
        problemas.push(...extra);
      } else {
        problemas.push(
          ...parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`),
        );
      }
    }

    ultimoProblema = problemas.join(" | ");
    prompt =
      `${opts.prompt}\n\n` +
      `--- CORRECCIÓN NECESARIA (intento ${intento + 1} fallido) ---\n` +
      `Tu respuesta anterior fue rechazada por estos motivos:\n${problemas.map((p) => `- ${p}`).join("\n")}\n` +
      `Responde de nuevo SOLO con el JSON corregido, sin texto adicional ni bloques de código.`;
  }

  throw new LLMError("La respuesta del LLM no superó la validación", "VALIDATION", ultimoProblema);
}
