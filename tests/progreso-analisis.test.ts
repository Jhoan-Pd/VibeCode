import { describe, expect, it } from "vitest";
import type { AnalysisEvent } from "@/lib/analysis-events";
import { PROGRESO_INICIAL, aplicarEvento, desenlace } from "@/lib/client/progreso-analisis";

const reproducir = (eventos: AnalysisEvent[]) => eventos.reduce(aplicarEvento, PROGRESO_INICIAL);

describe("reducer del progreso del análisis", () => {
  it("un análisis completo lleva a la página de resultados", () => {
    const p = reproducir([
      { type: "start", analisisId: "a1" },
      { type: "stage", etapa: "resumen", status: "running" },
      { type: "stage", etapa: "resumen", status: "done" },
      { type: "stage", etapa: "quiz", status: "error", message: "Límite" },
      { type: "done", analisisId: "a1", estado: "COMPLETO" },
    ]);
    expect(p.etapas.resumen).toBe("done");
    expect(p.etapas.quiz).toBe("error");
    expect(p.etapas.lineas).toBe("pendiente");
    expect(p.mensajes).toEqual({ quiz: "Límite" });
    expect(desenlace(p)).toEqual({ tipo: "ir", url: "/analysis/a1" });
  });

  it("desde la caché añade ?cache=1", () => {
    expect(desenlace(reproducir([{ type: "done", analisisId: "c", estado: "COMPLETO", desdeCache: true }]))).toEqual({ tipo: "ir", url: "/analysis/c?cache=1" });
  });

  it("un error conserva el id para enlazar el análisis guardado", () => {
    const p = reproducir([{ type: "start", analisisId: "x" }, { type: "error", message: "Sin cupo" }]);
    expect(desenlace(p)).toEqual({ tipo: "error", mensaje: "Sin cupo", analisisId: "x" });
  });

  it("si el stream se corta sin id, avisa", () => {
    expect(desenlace(PROGRESO_INICIAL)).toMatchObject({ tipo: "error", analisisId: null });
  });

  it("no muta el estado anterior", () => {
    const antes = PROGRESO_INICIAL;
    aplicarEvento(antes, { type: "stage", etapa: "resumen", status: "done" });
    expect(antes.etapas.resumen).toBe("pendiente");
  });
});
