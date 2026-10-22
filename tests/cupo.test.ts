import { beforeEach, describe, expect, it, vi } from "vitest";

// conCupo vive en un servicio de servidor: se simulan "server-only" y la BD.
vi.mock("server-only", () => ({}));
const queryRaw = vi.fn();
const updateMany = vi.fn();
vi.mock("@/lib/db", () => ({ db: { $queryRaw: (...a: unknown[]) => queryRaw(...a), usoDiario: { updateMany: (...a: unknown[]) => updateMany(...a) } } }));

const { conCupo } = await import("@/services/limite.service");

describe("conCupo (reservar y compensar)", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("con cupo ejecuta la acción y devuelve su valor y lo que queda", async () => {
    queryRaw.mockResolvedValue([{ usados: 3 }]);
    const r = await conCupo("u1", "consultas", async () => "hecho");
    expect(r).toMatchObject({ agotado: false, valor: "hecho" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("sin cupo no ejecuta la acción", async () => {
    queryRaw.mockResolvedValue([]);
    const accion = vi.fn();
    const r = await conCupo("u1", "consultas", accion);
    expect(r.agotado).toBe(true);
    expect(accion).not.toHaveBeenCalled();
  });

  it("si la acción falla devuelve la unidad y propaga el error", async () => {
    queryRaw.mockResolvedValue([{ usados: 1 }]);
    await expect(conCupo("u1", "analisis", async () => Promise.reject(new Error("caído")))).rejects.toThrow("caído");
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});
