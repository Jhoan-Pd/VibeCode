import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// bcrypt real con costo 12 haría lenta la prueba: se simula.
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hash"), compare: vi.fn(async () => false) } }));
const findUnique = vi.fn();
const create = vi.fn();
vi.mock("@/lib/db", () => ({ db: { usuario: { findUnique: (...a: unknown[]) => findUnique(...a), create: (...a: unknown[]) => create(...a) } } }));

const { EmailEnUsoError, registrarUsuario, verificarCredenciales } = await import("@/services/usuarios");
const bcrypt = (await import("bcryptjs")).default;
const DATOS = { nombre: "Ana", email: "ana@correo.com", password: "secreta123" };

describe("usuarios", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
  });

  it("si otro registro gana la carrera (P2002), responde «correo en uso» y no un 500", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    await expect(registrarUsuario(DATOS)).rejects.toBeInstanceOf(EmailEnUsoError);
  });

  it("otros errores de la BD se propagan tal cual", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(new Error("conexión perdida"));
    await expect(registrarUsuario(DATOS)).rejects.toThrow("conexión perdida");
  });

  it("con un correo inexistente compara igual contra el hash de relleno, calculado una sola vez", async () => {
    vi.mocked(bcrypt.hash).mockClear();
    findUnique.mockResolvedValue(null);
    expect(await verificarCredenciales("x@y.com", "a")).toBeNull();
    expect(await verificarCredenciales("x@y.com", "b")).toBeNull();
    expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
  });
});
