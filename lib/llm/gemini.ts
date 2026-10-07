import { LLM_TIMEOUT_MS } from "@/lib/config";
import { sleep } from "@/lib/utils";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "./types";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /** Permite apuntar a otro host (pruebas con un servidor simulado). */
  baseUrl?: string;
  timeoutMs?: number;
}

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
 * La API key solo existe en el servidor; este archivo nunca se importa desde componentes cliente.
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiOptions) {
    if (!options.apiKey) {
      throw new LLMError("Falta GEMINI_API_KEY en las variables de entorno del servidor.", "AUTH");
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = (options.baseUrl ?? "https://generativelanguage.googleapis.com").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? 8192,
        ...(request.json ? { responseMimeType: "application/json" } : {}),
      },
    };

    // Hasta 3 intentos solo para errores transitorios (429 con espera corta, 500/503).
    const MAX_INTENTOS = 3;
    let ultimoError: LLMError | null = null;

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      let res: Response;
      try {
        const timeout = AbortSignal.timeout(this.timeoutMs);
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify(body),
          signal: request.signal ? AbortSignal.any([request.signal, timeout]) : timeout,
        });
      } catch (e) {
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
          throw new LLMError("Timeout llamando a Gemini", "TIMEOUT");
        }
        throw new LLMError("No se pudo contactar a Gemini", "UNAVAILABLE", e instanceof Error ? e.message : undefined);
      }

      const data = (await res.json().catch(() => ({}))) as GeminiResponseBody;

      if (res.ok) return this.parse(data);

      const detalle = data.error?.message?.slice(0, 300);
      if (res.status === 400 && /api key/i.test(detalle ?? "")) throw new LLMError("API key inválida", "AUTH", detalle);
      if (res.status === 401 || res.status === 403) throw new LLMError("Gemini rechazó la clave", "AUTH", detalle);

      if (res.status === 429) {
        const espera = this.retryDelayMs(data);
        // Solo reintentamos si la espera sugerida es corta; si no, avisamos al usuario.
        if (espera !== null && espera <= 15_000 && intento < MAX_INTENTOS) {
          await sleep(espera + 250);
          continue;
        }
        throw new LLMError("Límite de uso de Gemini alcanzado", "RATE_LIMIT", detalle);
      }

      if (res.status >= 500) {
        ultimoError = new LLMError("Gemini no disponible", "UNAVAILABLE", detalle);
        if (intento < MAX_INTENTOS) {
          await sleep(1200 * intento + Math.random() * 400);
          continue;
        }
        throw ultimoError;
      }

      throw new LLMError(`Gemini respondió ${res.status}`, "BAD_RESPONSE", detalle);
    }

    throw ultimoError ?? new LLMError("Gemini no respondió", "UNAVAILABLE");
  }

  private parse(data: GeminiResponseBody): LLMResponse {
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
    if (!texto.trim()) {
      throw new LLMError("Gemini devolvió una respuesta vacía", "BAD_RESPONSE", candidato?.finishReason);
    }

    return {
      text: texto,
      model: this.model,
      finishReason: candidato?.finishReason,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
      },
    };
  }

  /** Lee "retryDelay": "12s" de los detalles del error 429 de Google. */
  private retryDelayMs(data: GeminiResponseBody): number | null {
    const raw = data.error?.details?.find((d) => d.retryDelay)?.retryDelay;
    if (!raw) return null;
    const segundos = Number.parseFloat(raw);
    return Number.isFinite(segundos) ? Math.round(segundos * 1000) : null;
  }
}
