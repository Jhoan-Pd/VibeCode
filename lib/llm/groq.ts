import { ProveedorHttp, segundosAMs, type OpcionesProveedorHttp, type PeticionHttp } from "./http";
import { LLMError, type LLMRequest, type LLMResponse } from "./types";

export type GroqOptions = OpcionesProveedorHttp;

interface GroqResponseBody {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
  error?: { message?: string; type?: string; code?: string };
}

/** Códigos con los que Groq indica que el modelo configurado no sirve. */
const MODELO_INVALIDO = new Set(["model_not_found", "model_decommissioned"]);

/**
 * Proveedor Groq (API compatible con OpenAI: /openai/v1/chat/completions). Se usa como RESPALDO
 * de Gemini o como proveedor principal con LLM_PROVIDER=groq. Igual que Gemini, solo vive en el servidor.
 */
export class GroqProvider extends ProveedorHttp<GroqResponseBody> {
  constructor(options: GroqOptions) {
    super({ name: "groq", etiqueta: "Groq", urlPorDefecto: "https://api.groq.com", variableClave: "GROQ_API_KEY" }, options);
  }

  protected peticion(request: LLMRequest): PeticionHttp {
    return {
      url: `${this.baseUrl}/openai/v1/chat/completions`,
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: {
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
      },
    };
  }

  protected mensajeDeError(data: GroqResponseBody) {
    return data.error?.message;
  }

  protected errorEspecifico(status: number, data: GroqResponseBody, detalle: string | undefined) {
    const codigo = data.error?.code;
    if (status === 404 || (codigo && MODELO_INVALIDO.has(codigo))) return new LLMError(`El modelo ${this.model} no existe en Groq`, "CONFIG", detalle);
    // En modo JSON, Groq responde 400 "json_validate_failed" si el modelo no produjo JSON válido:
    // es un fallo de formato (lo reintenta generateJson con el error), no un error de configuración.
    if (status === 400 && (codigo === "json_validate_failed" || /json/i.test(detalle ?? ""))) {
      return new LLMError("Groq no generó JSON válido", "BAD_RESPONSE", detalle);
    }
    return null;
  }

  /** Groq indica la espera en la cabecera estándar Retry-After (segundos). */
  protected esperaSugerida(res: Response) {
    return segundosAMs(res.headers.get("retry-after"));
  }

  protected interpretar(data: GroqResponseBody): LLMResponse {
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
