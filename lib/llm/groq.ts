import { LLM_TIMEOUT_MS } from "@/lib/config";
import { sleep } from "@/lib/utils";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "./types";

export interface GroqOptions {
  apiKey: string;
  model: string;
  /** Permite apuntar a otro host (pruebas con un servidor simulado). */
  baseUrl?: string;
  timeoutMs?: number;
}

interface GroqResponseBody {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string; code?: string };
}

/**
 * Proveedor Groq (API compatible con OpenAI: /openai/v1/chat/completions). Se usa como RESPALDO
 * de Gemini o como proveedor principal con LLM_PROVIDER=groq. Igual que Gemini, solo vive en el servidor.
 */
export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: GroqOptions) {
    if (!options.apiKey) throw new LLMError("Falta GROQ_API_KEY en las variables de entorno del servidor.", "AUTH");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = (options.baseUrl ?? "https://api.groq.com").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const url = `${this.baseUrl}/openai/v1/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      temperature: request.temperature ?? 0.2,
      max_completion_tokens: request.maxOutputTokens ?? 8192,
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
      // Los modelos de razonamiento (gpt-oss) gastan menos tokens y tiempo con esfuerzo bajo.
      ...(/gpt-oss/i.test(this.model) ? { reasoning_effort: "low" } : {}),
    };

    const MAX_INTENTOS = 3;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      let res: Response;
      try {
        const timeout = AbortSignal.timeout(this.timeoutMs);
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify(body),
          signal: request.signal ? AbortSignal.any([request.signal, timeout]) : timeout,
        });
      } catch (e) {
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new LLMError("Timeout llamando a Groq", "TIMEOUT");
        throw new LLMError("No se pudo contactar a Groq", "UNAVAILABLE", e instanceof Error ? e.message : undefined);
      }

      const data = (await res.json().catch(() => ({}))) as GroqResponseBody;
      if (res.ok) return this.parse(data);

      const detalle = data.error?.message?.slice(0, 300);
      if (res.status === 401 || res.status === 403) throw new LLMError("Groq rechazó la clave", "AUTH", detalle);
      if (res.status === 404 || data.error?.code === "model_not_found" || data.error?.code === "model_decommissioned") {
        throw new LLMError(`El modelo ${this.model} no existe en Groq`, "CONFIG", detalle);
      }
      if (res.status === 429) {
        const espera = segundosRetryAfter(res.headers.get("retry-after"));
        if (espera !== null && espera <= 15_000 && intento < MAX_INTENTOS) {
          await sleep(espera + 250);
          continue;
        }
        throw new LLMError("Límite de uso de Groq alcanzado", "RATE_LIMIT", detalle);
      }
      // En modo JSON, Groq responde 400 "json_validate_failed" si el modelo no produjo JSON válido:
      // es un fallo de formato (lo reintenta generateJson con el error), no un error de configuración.
      if (res.status === 400 && (data.error?.code === "json_validate_failed" || /json/i.test(detalle ?? ""))) {
        throw new LLMError("Groq no generó JSON válido", "BAD_RESPONSE", detalle);
      }
      if (res.status >= 500) {
        if (intento < MAX_INTENTOS) {
          await sleep(1200 * intento + Math.random() * 400);
          continue;
        }
        throw new LLMError("Groq no disponible", "UNAVAILABLE", detalle);
      }
      throw new LLMError(`Groq respondió ${res.status}`, "BAD_RESPONSE", detalle);
    }
    throw new LLMError("Groq no respondió", "UNAVAILABLE");
  }

  private parse(data: GroqResponseBody): LLMResponse {
    const opcion = data.choices?.[0];
    const texto = opcion?.message?.content ?? "";
    if (opcion?.finish_reason === "content_filter") throw new LLMError("Respuesta bloqueada por Groq", "BLOCKED");
    if (!texto.trim()) throw new LLMError("Groq devolvió una respuesta vacía", "BAD_RESPONSE", opcion?.finish_reason);
    return {
      text: texto,
      model: data.model ?? this.model,
      // Se traduce al vocabulario común para que generateJson detecte respuestas cortadas.
      finishReason: opcion?.finish_reason === "length" ? "MAX_TOKENS" : opcion?.finish_reason,
      usage: { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens },
    };
  }
}

function segundosRetryAfter(valor: string | null): number | null {
  if (!valor) return null;
  const s = Number.parseFloat(valor);
  return Number.isFinite(s) ? Math.round(s * 1000) : null;
}
