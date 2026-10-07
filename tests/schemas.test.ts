import { describe, expect, it } from "vitest";
import { DEMO_BLOQUES, DEMO_CODIGO, DEMO_DIAGRAMA, DEMO_RESUMEN } from "@/lib/demo";
import { dividirLineas } from "@/lib/chunking";
import { normalizarMermaid, validarMermaidBasico } from "@/lib/mermaid";
import { AnalyzeRequestSchema, BloquesSchema, DiagramaSchema, ResumenSchema } from "@/schemas/analysis";
import { RegisterSchema } from "@/schemas/auth";
import { repararSolapes, validarBloques } from "@/services/generators/validacion";

describe("AnalyzeRequestSchema", () => {
  it("acepta una solicitud válida y pone lenguaje 'auto' por defecto", () => {
    const r = AnalyzeRequestSchema.parse({ codigo: "const a = 1;", nivel: "INTERMEDIO" });
    expect(r.lenguaje).toBe("auto");
  });

  it("rechaza código vacío, binario o demasiado largo", () => {
    expect(AnalyzeRequestSchema.safeParse({ codigo: "", nivel: "INTERMEDIO" }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ codigo: "ab\u0000cd", nivel: "INTERMEDIO" }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ codigo: "x".repeat(20_001), nivel: "INTERMEDIO" }).success).toBe(false);
  });

  it("rechaza niveles y lenguajes desconocidos", () => {
    expect(AnalyzeRequestSchema.safeParse({ codigo: "let a = 1", nivel: "EXPERTO" }).success).toBe(false);
    expect(AnalyzeRequestSchema.safeParse({ codigo: "let a = 1", nivel: "AVANZADO", lenguaje: "cobol" }).success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("normaliza el correo a minúsculas y exige contraseña de 8+ caracteres", () => {
    const ok = RegisterSchema.parse({ nombre: "Ana", email: "  ANA@Correo.com ", password: "12345678" });
    expect(ok.email).toBe("ana@correo.com");
    expect(RegisterSchema.safeParse({ nombre: "Ana", email: "ana@correo.com", password: "1234" }).success).toBe(false);
  });
});

describe("esquemas de salida del LLM", () => {
  it("el análisis de demostración cumple los esquemas", () => {
    expect(ResumenSchema.safeParse(DEMO_RESUMEN).success).toBe(true);
    expect(BloquesSchema.safeParse({ bloques: DEMO_BLOQUES }).success).toBe(true);
    expect(DiagramaSchema.safeParse(DEMO_DIAGRAMA).success).toBe(true);
  });

  it("los bloques de la demo son válidos para el código de la demo (rango y cobertura)", () => {
    const lineas = dividirLineas(DEMO_CODIGO);
    const problemas = validarBloques(DEMO_BLOQUES, { inicio: 1, fin: lineas.length }, lineas, 0.95);
    expect(problemas).toEqual([]);
    expect(repararSolapes(DEMO_BLOQUES)).toHaveLength(DEMO_BLOQUES.length);
  });

  it("convierte números en texto (coerce) y rechaza rangos invertidos", () => {
    const ok = BloquesSchema.safeParse({ bloques: [{ lineaInicio: "2", lineaFin: "5", titulo: "Bucle", explicacion: "Recorre la lista." }] });
    expect(ok.success).toBe(true);
    const mal = BloquesSchema.safeParse({ bloques: [{ lineaInicio: 9, lineaFin: 3, titulo: "Bucle", explicacion: "Recorre la lista." }] });
    expect(mal.success).toBe(false);
  });

  it("rechaza un resumen sin propósito", () => {
    expect(ResumenSchema.safeParse({ proposito: "", entradas: [], salidas: [], dependencias: [] }).success).toBe(false);
  });
});

describe("validarBloques / repararSolapes", () => {
  const lineas = ["a", "b", "", "c", "d", "e"];
  const bloque = (i: number, f: number) => ({ lineaInicio: i, lineaFin: f, titulo: "Bloque", explicacion: "Explicación válida." });

  it("detecta bloques fuera de rango", () => {
    const p = validarBloques([bloque(1, 9)], { inicio: 1, fin: 6 }, lineas);
    expect(p.some((m) => m.includes("fuera del rango"))).toBe(true);
  });

  it("detecta cobertura insuficiente", () => {
    const p = validarBloques([bloque(1, 1)], { inicio: 1, fin: 6 }, lineas);
    expect(p.some((m) => m.includes("cubren"))).toBe(true);
  });

  it("resuelve solapes recortando el bloque posterior y descarta los totalmente cubiertos", () => {
    const r = repararSolapes([bloque(1, 4), bloque(3, 6), bloque(2, 3)]);
    expect(r.map((b) => [b.lineaInicio, b.lineaFin])).toEqual([
      [1, 4],
      [5, 6],
    ]);
  });
});

describe("mermaid: normalización y validación básica", () => {
  it("quita fences, directivas init y click, y añade encabezado si falta", () => {
    const sucio = '```mermaid\n%%{init: {"theme":"dark"}}%%\nA["x"] --> B["y"]\nclick A "http://evil"\n```';
    const limpio = normalizarMermaid(sucio);
    expect(limpio.startsWith("flowchart TD")).toBe(true);
    expect(limpio).not.toContain("click");
    expect(limpio).not.toContain("%%{init");
  });

  it("convierte \\n literales en saltos de línea", () => {
    const r = normalizarMermaid('flowchart TD\\n  A["a"] --> B["b"]');
    expect(r.split("\n")).toHaveLength(2);
  });

  it("marca como inválido un diagrama sin flechas o con comillas impares", () => {
    expect(validarMermaidBasico("flowchart TD\n  A[\"solo\"]").length).toBeGreaterThan(0);
    expect(validarMermaidBasico('flowchart TD\n  A["abierto --> B["x"]').length).toBeGreaterThan(0);
    expect(validarMermaidBasico(normalizarMermaid(DEMO_DIAGRAMA.mermaid))).toEqual([]);
  });
});
