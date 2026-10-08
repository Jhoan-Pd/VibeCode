import { describe, expect, it } from "vitest";
import { normalizarMermaid, validarMermaidBasico } from "@/lib/mermaid";

describe("Mermaid por tipo de diagrama", () => {
  it("añade el encabezado correcto según el tipo cuando el LLM lo omite", () => {
    expect(normalizarMermaid("A --> B").split("\n")[0]).toBe("flowchart TD");
    expect(normalizarMermaid("class Usuario", "CLASES").split("\n")[0]).toBe("classDiagram");
    expect(normalizarMermaid("A->>B: hola", "SECUENCIA").split("\n")[0]).toBe("sequenceDiagram");
  });

  it("elimina interacciones peligrosas en cualquier tipo", () => {
    const limpio = normalizarMermaid('classDiagram\n  class A\n  click A href "https://malo.com"\n  link A "https://x"', "CLASES");
    expect(limpio).not.toMatch(/click|https/);
  });

  it("acepta un diagrama de clases con una sola clase o con relaciones", () => {
    expect(validarMermaidBasico("classDiagram\n  class Cuenta {\n    +saldo number\n  }", "CLASES")).toEqual([]);
    expect(validarMermaidBasico("classDiagram\n  Animal <|-- Perro", "CLASES")).toEqual([]);
  });

  it("rechaza un diagrama de clases con encabezado de flujo", () => {
    expect(validarMermaidBasico("flowchart TD\n  A --> B", "CLASES").join(" ")).toMatch(/classDiagram/);
  });

  it("exige mensajes en el diagrama de secuencia y rechaza punto y coma final", () => {
    expect(validarMermaidBasico("sequenceDiagram\n  participant A\n  A->>B: pide datos\n  B-->>A: responde", "SECUENCIA")).toEqual([]);
    expect(validarMermaidBasico("sequenceDiagram\n  participant A", "SECUENCIA").length).toBeGreaterThan(0);
    expect(validarMermaidBasico("sequenceDiagram\n  A->>B: hola;", "SECUENCIA").join(" ")).toMatch(/punto y coma/);
  });
});
