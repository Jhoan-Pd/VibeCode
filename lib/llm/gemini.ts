import { ProveedorHttp, segundosAMs, type OpcionesProveedorHttp, type PeticionHttp } from "./http";
import { LLMError, type LLMRequest, type LLMResponse } from "./types";

export type GeminiOptions = OpcionesProveedorHttp;

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiResponseBody {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; details?: { retryDelay?: string; "@type"?: string }[] };
}

/**
 * Proveedor Gemini vía REST (sin SDK: una dependencia menos y control total de errores).
 * Los reintentos y la traducción de errores comunes están en ProveedorHttp; aquí solo el formato de Google.
 * La API key solo existe en el servidor; este archivo nunca se importa desde componentes cliente.
 */
export class GeminiProvider extends ProveedorHttp<GeminiResponseBody> {
  constructor(options: GeminiOptions) {
    super({ name: "gemini", etiqueta: "Gemini", urlPorDefecto: "https://generativelanguage.googleapis.com", variableClave: "GEMINI_API_KEY" }, options);
  }

  protected peticion(request: LLMRequest): PeticionHttp {
    return {
      url: `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      headers: { "x-goog-api-key": this.apiKey },
      body: {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          maxOutputTokens: request.maxOutputTokens ?? 8192,
          ...(request.json ? { responseMimeType: "application/json" } : {}),
        },
      },
    };
  }

  protected mensajeDeError(data: GeminiResponseBody) {
    return data.error?.message;
  }

  protected errorEspecifico(status: number, _data: GeminiResponseBody, detalle: string | undefined) {
    // Google responde 400 (no 401) cuando la clave es inválida.
    if (status === 400 && /api key/i.test(detalle ?? "")) return new LLMError("API key inválida", "AUTH", detalle);
    if (status === 404) return new LLMError(`El modelo ${this.model} no existe en Gemini`, "CONFIG", detalle);
    return null;
  }

  /** Lee "retryDelay": "12s" de los detalles del error 429 de Google. */
  protected esperaSugerida(_res: Response, data: GeminiResponseBody) {
    return segundosAMs(data.error?.details?.find((d) => d.retryDelay)?.retryDelay);
  }

  protected interpretar(data: GeminiResponseBody): LLMResponse {
    if (data.promptFeedback?.blockReason) {
      throw new LLMError("Solicitud bloqueada por Gemini", "BLOCKED", data.promptFeedback.blockReason);
    }
    const candidato = data.candidates?.[0];
    // Se descartan las partes de "pensamiento" si el modelo las devuelve.
    const texto = (candidato?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");

    if (candidato?.finishReason === "SAFETY") throw new LLMError("Respuesta bloqueada por seguridad", "BLOCKED");
    if (!texto.trim()) throw new LLMError("Gemini devolvió una respuesta vacía", "BAD_RESPONSE", candidato?.finishReason);

    return {
      text: texto,
      model: this.model,
      finishReason: candidato?.finishReason,
      usage: { inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount },
    };
  }
}
