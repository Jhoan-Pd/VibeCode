import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { crearProveedorDesdeEntorno } from "@/lib/llm/fabrica";
import { GroqProvider } from "@/lib/llm/groq";
import { generateJson } from "@/lib/llm/json";
import { ProveedorConRespaldo } from "@/lib/llm/respaldo";
import { LLMError, type LLMProvider, type LLMRequest } from "@/lib/llm/types";

const PETICION: LLMRequest = { system: "sistema", prompt: "hola", json: true };

function respuestaJson(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

afterEach(() => vi.unstubAllGlobals());

describe("GroqProvider", () => {
  it("envía el formato de OpenAI con modo JSON y la clave solo en la cabecera", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respuestaJson(200, { choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 3 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const groq = new GroqProvider({ apiKey: "gsk_prueba", model: "openai/gpt-oss-20b", baseUrl: "http://groq.local" });
    const r = await groq.generate(PETICION);

    expect(r.text).toBe('{"ok":true}');
    expect(r.usage).toEqual({ inputTokens: 5, outputTokens: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://groq.local/openai/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer gsk_prueba");
    const body = JSON.parse(init.body);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.reasoning_effort).toBe("low");
    expect(init.body).not.toContain("gsk_prueba");
  });

  it("traduce los errores HTTP a códigos comunes", async () => {
    const groq = new GroqProvider({ apiKey: "k", model: "m", baseUrl: "http://groq.local" });
    const casos: [number, unknown, string][] = [
      [401, { error: { message: "Invalid API Key" } }, "AUTH"],
      [429, { error: { message: "Rate limit" } }, "RATE_LIMIT"],
      [404, { error: { message: "model not found", code: "model_not_found" } }, "CONFIG"],
      [400, { error: { message: "Failed to generate JSON", code: "json_validate_failed" } }, "BAD_RESPONSE"],
    ];
    for (const [status, body, codigo] of casos) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaJson(status, body)));
      await expect(groq.generate(PETICION)).rejects.toMatchObject({ code: codigo });
    }
  });

  it("marca como MAX_TOKENS una respuesta cortada por longitud", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaJson(200, { choices: [{ message: { content: '{"a":' }, finish_reason: "length" }] })));
    const r = await new GroqProvider({ apiKey: "k", model: "llama", baseUrl: "http://x" }).generate(PETICION);
    expect(r.finishReason).toBe("MAX_TOKENS");
  });
});

/** Proveedor falso que responde lo que se le indique, en orden. */
function falso(nombre: string, salidas: (string | LLMError)[]): LLMProvider & { llamadas: number } {
  const p = {
    name: nombre,
    model: `${nombre}-modelo`,
    llamadas: 0,
    async generate() {
      const s = salidas[Math.min(p.llamadas, salidas.length - 1)];
      p.llamadas++;
      if (s instanceof LLMError) throw s;
      return { text: s, model: p.model };
    },
  };
  return p;
}

describe("ProveedorConRespaldo", () => {
  it("usa el respaldo si el principal falla por límite, caída, timeout o clave", async () => {
    for (const codigo of ["RATE_LIMIT", "UNAVAILABLE", "TIMEOUT", "AUTH", "CONFIG"] as const) {
      const principal = falso("gemini", [new LLMError("x", codigo)]);
      const respaldo = falso("groq", ['{"de":"groq"}']);
      const p = new ProveedorConRespaldo(principal, respaldo, () => {});
      expect((await p.generate(PETICION)).text).toBe('{"de":"groq"}');
      expect(respaldo.llamadas).toBe(1);
    }
  });

  it("no usa el respaldo si el principal responde, ni ante errores de formato", async () => {
    const respaldo = falso("groq", ["{}"]);
    const bien = new ProveedorConRespaldo(falso("gemini", ['{"de":"gemini"}']), respaldo, () => {});
    expect((await bien.generate(PETICION)).text).toBe('{"de":"gemini"}');
    const formato = new ProveedorConRespaldo(falso("gemini", [new LLMError("x", "BAD_RESPONSE")]), respaldo, () => {});
    await expect(formato.generate(PETICION)).rejects.toMatchObject({ code: "BAD_RESPONSE" });
    expect(respaldo.llamadas).toBe(0);
  });

  it("se identifica con ambos nombres", () => {
    expect(new ProveedorConRespaldo(falso("gemini", ["{}"]), falso("groq", ["{}"])).name).toBe("gemini+groq");
  });
});

describe("generateJson con respuestas vacías", () => {
  it("una respuesta vacía (BAD_RESPONSE) se reintenta como fallo de formato", async () => {
    const p = falso("groq", [new LLMError("vacía", "BAD_RESPONSE"), '{"n":1}']);
    const { data, intentos } = await generateJson({ provider: p, system: "s", prompt: "p", schema: z.object({ n: z.number() }) });
    expect(data.n).toBe(1);
    expect(intentos).toBe(2);
  });

  it("los errores de límite NO se reintentan con otro prompt", async () => {
    const p = falso("gemini", [new LLMError("límite", "RATE_LIMIT"), '{"n":1}']);
    await expect(generateJson({ provider: p, system: "s", prompt: "p", schema: z.object({ n: z.number() }) })).rejects.toMatchObject({ code: "RATE_LIMIT" });
    expect(p.llamadas).toBe(1);
  });
});

describe("fábrica de proveedores", () => {
  it("Gemini con Groq de respaldo cuando hay las dos claves", () => {
    expect(crearProveedorDesdeEntorno({ GEMINI_API_KEY: "a", GROQ_API_KEY: "b" }).name).toBe("gemini+groq");
  });

  it("solo uno si falta la otra clave o el respaldo está desactivado", () => {
    expect(crearProveedorDesdeEntorno({ GEMINI_API_KEY: "a" }).name).toBe("gemini");
    expect(crearProveedorDesdeEntorno({ GEMINI_API_KEY: "a", GROQ_API_KEY: "b", LLM_FALLBACK: "none" }).name).toBe("gemini");
    expect(crearProveedorDesdeEntorno({ GROQ_API_KEY: "b" }).name).toBe("groq");
  });

  it("Groq como principal y Gemini de respaldo", () => {
    const p = crearProveedorDesdeEntorno({ LLM_PROVIDER: "groq", GEMINI_API_KEY: "a", GROQ_API_KEY: "b", GROQ_MODEL: "llama-x" });
    expect(p.name).toBe("groq+gemini");
    expect(p.model).toContain("llama-x");
  });

  it("errores claros sin claves o con un proveedor desconocido", () => {
    expect(() => crearProveedorDesdeEntorno({})).toThrow(/GEMINI_API_KEY/);
    expect(() => crearProveedorDesdeEntorno({ LLM_PROVIDER: "openai", GEMINI_API_KEY: "a" })).toThrow(/no soportado/);
  });
});
