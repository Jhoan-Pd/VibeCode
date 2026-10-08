import { describe, expect, it } from "vitest";
import { estadoCupo, fechaClave, mensajeLimite } from "@/lib/limites";

describe("límite diario", () => {
  it("calcula el día en la zona horaria configurada (medianoche local, no UTC)", () => {
    // 3:30 UTC del 9 de octubre = 22:30 del 8 de octubre en Bogotá (UTC-5).
    const instante = new Date("2026-10-09T03:30:00Z");
    expect(fechaClave(instante, "America/Bogota")).toBe("2026-10-08");
    expect(fechaClave(instante, "UTC")).toBe("2026-10-09");
  });

  it("si la zona horaria no existe usa UTC en lugar de fallar", () => {
    expect(fechaClave(new Date("2026-01-02T10:00:00Z"), "Zona/Inventada")).toBe("2026-01-02");
  });

  it("los restantes nunca son negativos", () => {
    expect(estadoCupo(3, 10)).toEqual({ usados: 3, limite: 10, restantes: 7 });
    expect(estadoCupo(12, 10).restantes).toBe(0);
  });

  it("explica el límite según el recurso", () => {
    expect(mensajeLimite("analisis", 10)).toMatch(/10 análisis/);
    expect(mensajeLimite("consultas", 60)).toMatch(/60 consultas/);
  });
});
