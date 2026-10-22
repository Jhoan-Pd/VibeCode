import { afterEach, describe, expect, it, vi } from "vitest";
import { pedirJson } from "@/lib/client/api";
import { SIN_CONEXION } from "@/lib/mensajes";

afterEach(() => vi.unstubAllGlobals());
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("pedirJson", () => {
  it("envía JSON y devuelve los datos si la respuesta es 2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { token: "t" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await pedirJson<{ token: string }>("/api/x", { cuerpo: { a: 1 }, errorPorDefecto: "falló" });
    expect(r).toEqual({ ok: true, datos: { token: "t" } });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: '{"a":1}', headers: { "content-type": "application/json" } });
  });

  it("sin cuerpo no manda cabeceras ni body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal("fetch", fetchMock);
    await pedirJson("/api/x", { metodo: "DELETE", errorPorDefecto: "falló" });
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: "DELETE" });
  });

  it("usa el mensaje del servidor, o el por defecto si no trae uno", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(429, { error: "Límite diario" })));
    expect(await pedirJson("/api/x", { errorPorDefecto: "falló" })).toEqual({ ok: false, error: "Límite diario", status: 429 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));
    expect(await pedirJson("/api/x", { errorPorDefecto: "falló" })).toEqual({ ok: false, error: "falló", status: 500 });
  });

  it("un fallo de red se traduce a «sin conexión»", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await pedirJson("/api/x", { errorPorDefecto: "falló" })).toEqual({ ok: false, error: SIN_CONEXION, status: null });
  });
});
