import { afterEach, describe, expect, it, vi } from "vitest";
import { segundosAMs } from "@/lib/llm/http";
import type { LLMRequest } from "@/lib/llm/types";

// Sin esperas reales entre reintentos.
vi.mock("@/lib/utils", async (original) => ({ ...(await original<typeof import("@/lib/utils")>()), sleep: vi.fn().mockResolvedValue(undefined) }));
const { GeminiProvider } = await import("@/lib/llm/gemini");

const PETICION: LLMRequest = { system: "sistema", prompt: "hola", json: true };
const OK = { candidates: [{ content: { parts: [{ text: "pienso…", thought: true }, { text: '{"ok":1}' }] }, finishReason: "STOP" }] };

function respuesta(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
const gemini = () => new GeminiProvider({ apiKey: "AIza_prueba", model: "gemini-x", baseUrl: "http://gemini.local/" });

afterEach(() => vi.unstubAllGlobals());

describe("GeminiProvider (sobre ProveedorHttp)", () => {
  it("arma la petición de Google, manda la clave solo en la cabecera y descarta los «pensamientos»", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, OK));
    vi.stubGlobal("fetch", fetchMock);
    const r = await gemini().generate(PETICION);

    expect(r.text).toBe('{"ok":1}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://gemini.local/v1beta/models/gemini-x:generateContent");
    expect(init.headers["x-goog-api-key"]).toBe("AIza_prueba");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body).generationConfig.responseMimeType).toBe("application/json");
    expect(init.body).not.toContain("AIza_prueba");
  });

  it("traduce los errores propios y los comunes", async () => {
    const casos: [number, unknown, string][] = [
      [400, { error: { message: "API key not valid" } }, "AUTH"],
      [403, { error: { message: "denied" } }, "AUTH"],
      [404, { error: { message: "not found" } }, "CONFIG"],
      [429, { error: { message: "quota" } }, "RATE_LIMIT"],
      [418, {}, "BAD_RESPONSE"],
    ];
    for (const [status, body, codigo] of casos) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(status, body)));
      await expect(gemini().generate(PETICION)).rejects.toMatchObject({ code: codigo });
    }
  });

  it("reintenta un 503 y un 429 con espera corta antes de rendirse", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuesta(503, {}))
      .mockResolvedValueOnce(respuesta(429, { error: { details: [{ retryDelay: "2s" }] } }))
      .mockResolvedValueOnce(respuesta(200, OK));
    vi.stubGlobal("fetch", fetchMock);
    await expect(gemini().generate(PETICION)).resolves.toMatchObject({ text: '{"ok":1}' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("tras 3 caídas seguidas responde UNAVAILABLE", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => respuesta(500, {}));
    vi.stubGlobal("fetch", fetchMock);
    await expect(gemini().generate(PETICION)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("exige la clave al construirse", () => {
    expect(() => new GeminiProvider({ apiKey: "", model: "m" })).toThrow(/GEMINI_API_KEY/);
  });

  it("segundosAMs entiende «12s» y rechaza basura", () => {
    expect(segundosAMs("12s")).toBe(12_000);
    expect(segundosAMs("0.5")).toBe(500);
    expect(segundosAMs("pronto")).toBeNull();
    expect(segundosAMs(null)).toBeNull();
  });
});
