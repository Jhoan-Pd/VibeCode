import { describe, expect, it } from "vitest";
import { esReutilizable, type CandidatoCache } from "@/lib/cache";
import { hashCodigo } from "@/lib/hash";

const COMPLETO: CandidatoCache = {
  estado: "COMPLETO",
  versionPrompts: "v1",
  tieneResumen: true,
  bloques: 4,
  diagramaFlujo: true,
  conceptos: 3,
  auditado: true,
  preguntas: 6,
};

describe("caché por hash", () => {
  it("la clave cambia con el nivel pero no con espacios finales ni saltos de línea de Windows", () => {
    const codigo = "const a = 1;\nconsole.log(a);";
    expect(hashCodigo(codigo, "INTERMEDIO")).toBe(hashCodigo("const a = 1;   \r\nconsole.log(a);\n\n", "INTERMEDIO"));
    expect(hashCodigo(codigo, "INTERMEDIO")).not.toBe(hashCodigo(codigo, "AVANZADO"));
    expect(hashCodigo(codigo, "INTERMEDIO")).not.toBe(hashCodigo(codigo.replace("1", "2"), "INTERMEDIO"));
  });

  it("reutiliza solo análisis completos con todas las secciones", () => {
    expect(esReutilizable(COMPLETO, "v1")).toBe(true);
    for (const parcial of [
      { estado: "ERROR" },
      { estado: "PROCESANDO" },
      { tieneResumen: false },
      { bloques: 0 },
      { diagramaFlujo: false },
      { conceptos: 0 },
      { auditado: false },
      { preguntas: 0 },
    ]) {
      expect(esReutilizable({ ...COMPLETO, ...parcial }, "v1")).toBe(false);
    }
  });

  it("se invalida al cambiar la versión de los prompts", () => {
    expect(esReutilizable(COMPLETO, "v2")).toBe(false);
    expect(esReutilizable({ ...COMPLETO, versionPrompts: null }, "v1")).toBe(false);
  });
});
