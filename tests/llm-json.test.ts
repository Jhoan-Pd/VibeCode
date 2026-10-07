import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extraerJson, generateJson } from "@/lib/llm/json";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "@/lib/llm/types";

/** Proveedor falso: devuelve respuestas predefinidas y guarda los prompts recibidos. */
class FakeProvider implements LLMProvider {
  readonly name = "fake";
  readonly model = "fake-1";
  prompts: string[] = [];
  constructor(private respuestas: (string | Error)[]) {}
  async generate(req: LLMRequest): Promise<LLMResponse> {
    this.prompts.push(req.prompt);
    const r = this.respuestas.shift();
    if (r === undefined) throw new Error("sin más respuestas");
    if (r instanceof Error) throw r;
    return { text: r, model: this.model };
  }
}

const Schema = z.object({ n: z.coerce.number().int().min(1) });
const base = { system: "sys", prompt: "dame n", schema: Schema };

describe("extraerJson", () => {
  it("quita bloques ```json y texto alrededor", () => {
    expect(JSON.parse(extraerJson('Claro:\n```json\n{"n": 3}\n```\nListo'))).toEqual({ n: 3 });
    expect(JSON.parse(extraerJson('texto {"n": 4} más texto'))).toEqual({ n: 4 });
  });
});

describe("generateJson", () => {
  it("devuelve a la primera si la respuesta es válida", async () => {
    const p = new FakeProvider(['{"n": 2}']);
    const r = await generateJson({ ...base, provider: p });
    expect(r).toEqual({ data: { n: 2 }, intentos: 1 });
  });

  it("reintenta incluyendo el error de validación en el prompt y se recupera", async () => {
    const p = new FakeProvider(["no es json", '{"n": 0}', '{"n": 5}']);
    const r = await generateJson({ ...base, provider: p });
    expect(r.data.n).toBe(5);
    expect(r.intentos).toBe(3);
    expect(p.prompts[1]).toContain("CORRECCIÓN NECESARIA");
    expect(p.prompts[1]).toContain("no es JSON válido");
    expect(p.prompts[2]).toContain("n:"); // incluye la ruta del campo que falló en el esquema
  });

  it("falla con LLMError VALIDATION tras 1 intento + 2 reintentos", async () => {
    const p = new FakeProvider(["x", "y", "z", '{"n": 1}']);
    await expect(generateJson({ ...base, provider: p })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(p.prompts).toHaveLength(3);
  });

  it("aplica la validación semántica y reintenta con sus mensajes", async () => {
    const p = new FakeProvider(['{"n": 1}', '{"n": 10}']);
    const r = await generateJson({ ...base, provider: p, validate: (d) => (d.n < 5 ? ["n debe ser al menos 5"] : []) });
    expect(r.data.n).toBe(10);
    expect(p.prompts[1]).toContain("n debe ser al menos 5");
  });

  it("no reintenta errores del proveedor (límite de uso)", async () => {
    const p = new FakeProvider([new LLMError("límite", "RATE_LIMIT"), '{"n": 1}']);
    await expect(generateJson({ ...base, provider: p })).rejects.toMatchObject({ code: "RATE_LIMIT" });
    expect(p.prompts).toHaveLength(1);
  });
});
