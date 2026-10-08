import { describe, expect, it } from "vitest";
import { dividirLineas } from "@/lib/chunking";
import { DEMO_CODIGO, DEMO_CONCEPTOS, DEMO_HALLAZGOS, DEMO_PREGUNTAS, DEMO_QUIZ_LLM, DEMO_SECUENCIA } from "@/lib/demo";
import { normalizarMermaid, validarMermaidBasico } from "@/lib/mermaid";
import { calificar, validarQuiz } from "@/lib/quiz";
import { AuditoriaSchema, DiagramasEstructuralesSchema, GlosarioSchema, HallazgoSchema } from "@/schemas/analysis";
import { ordenarHallazgos } from "@/services/generators/auditor-codigo";
import { validarRangosOpcionales } from "@/services/generators/validacion";

const TOTAL = dividirLineas(DEMO_CODIGO).length;

describe("glosario", () => {
  it("la demo cumple el esquema y sus rangos están dentro del código", () => {
    expect(GlosarioSchema.safeParse({ conceptos: DEMO_CONCEPTOS }).success).toBe(true);
    expect(validarRangosOpcionales(DEMO_CONCEPTOS, TOTAL, "concepto")).toEqual([]);
  });

  it("acepta rangos nulos y detecta rangos fuera del archivo o invertidos", () => {
    expect(validarRangosOpcionales([{ lineaInicio: null, lineaFin: null }], 10, "concepto")).toEqual([]);
    expect(validarRangosOpcionales([{ lineaInicio: 3 }], 10, "concepto")).toEqual([]);
    expect(validarRangosOpcionales([{ lineaInicio: 8, lineaFin: 12 }], 10, "concepto")[0]).toMatch(/concepto 1/);
    expect(validarRangosOpcionales([{ lineaInicio: 6, lineaFin: 2 }], 10, "concepto")).toHaveLength(1);
  });
});

describe("auditoría", () => {
  it("la demo cumple el esquema y sus rangos son válidos", () => {
    expect(AuditoriaSchema.safeParse({ hallazgos: DEMO_HALLAZGOS }).success).toBe(true);
    expect(validarRangosOpcionales(DEMO_HALLAZGOS, TOTAL, "hallazgo")).toEqual([]);
  });

  it("tolera variaciones del LLM en tipo y severidad", () => {
    const h = HallazgoSchema.parse({
      tipo: "mala práctica",
      severidad: "Crítica",
      titulo: "Algo",
      descripcion: "Una descripción suficientemente larga.",
      sugerencia: "Corrígelo.",
    });
    expect(h.tipo).toBe("MALA_PRACTICA");
    expect(h.severidad).toBe("CRITICA");
    expect(HallazgoSchema.safeParse({ tipo: "ESTILO", severidad: "ALTA", titulo: "x".repeat(5), descripcion: "y".repeat(20), sugerencia: "zzzzz" }).success).toBe(false);
  });

  it("una auditoría sin hallazgos es válida", () => {
    expect(AuditoriaSchema.safeParse({ hallazgos: [] }).success).toBe(true);
  });

  it("ordena de mayor a menor severidad y luego por línea", () => {
    const orden = ordenarHallazgos([
      { severidad: "BAJA" as const, lineaInicio: 1 },
      { severidad: "CRITICA" as const, lineaInicio: 9 },
      { severidad: "MEDIA" as const, lineaInicio: null },
      { severidad: "MEDIA" as const, lineaInicio: 4 },
    ]);
    expect(orden.map((h) => `${h.severidad}:${h.lineaInicio}`)).toEqual(["CRITICA:9", "MEDIA:4", "MEDIA:null", "BAJA:1"]);
  });
});

describe("diagramas de clases y secuencia", () => {
  it("acepta null cuando no aplican y valida el diagrama de secuencia de la demo", () => {
    expect(DiagramasEstructuralesSchema.safeParse({ clases: null, secuencia: null }).success).toBe(true);
    expect(validarMermaidBasico(normalizarMermaid(DEMO_SECUENCIA.mermaid, "SECUENCIA"), "SECUENCIA")).toEqual([]);
  });
});

describe("quiz de la demo", () => {
  it("es válido y se puede aprobar con las respuestas correctas", () => {
    expect(validarQuiz(DEMO_QUIZ_LLM, TOTAL)).toEqual([]);
    const correctas = Object.fromEntries(DEMO_PREGUNTAS.map((p) => [p.id, p.respuestaCorrecta]));
    expect(calificar(DEMO_PREGUNTAS, correctas).porcentaje).toBe(100);
  });
});
