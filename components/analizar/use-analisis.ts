"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisEvent } from "@/lib/analysis-events";
import { analizarConStream, type AnalyzePayload } from "@/lib/client/analyze-stream";
import { PROGRESO_INICIAL, aplicarEvento, desenlace } from "@/lib/client/progreso-analisis";

export type Fase = "editando" | "analizando" | "error";
type Accion = { tipo: "reiniciar" } | { tipo: "evento"; evento: AnalysisEvent };

function reducer(estado: typeof PROGRESO_INICIAL, accion: Accion) {
  return accion.tipo === "reiniciar" ? PROGRESO_INICIAL : aplicarEvento(estado, accion.evento);
}

/**
 * Ejecuta el análisis por streaming. El progreso lo calcula el reducer puro `aplicarEvento`; el
 * resultado final se decide con `desenlace` y este hook solo navega o muestra el error.
 */
export function useAnalisis() {
  const router = useRouter();
  const [progreso, despachar] = useReducer(reducer, PROGRESO_INICIAL);
  const [fase, setFase] = useState<Fase>("editando");
  const [error, setError] = useState<{ mensaje: string; analisisId: string | null } | null>(null);

  async function analizar(payload: AnalyzePayload) {
    setFase("analizando");
    setError(null);
    despachar({ tipo: "reiniciar" });

    // El desenlace se calcula con los mismos eventos, en paralelo al estado de React (que es asíncrono).
    let final = PROGRESO_INICIAL;
    try {
      await analizarConStream(payload, (evento) => {
        final = aplicarEvento(final, evento);
        despachar({ tipo: "evento", evento });
      });
    } catch (err) {
      setError({ mensaje: err instanceof Error ? err.message : "No se pudo iniciar el análisis.", analisisId: null });
      setFase("error");
      return;
    }

    const d = desenlace(final);
    if (d.tipo === "ir") {
      router.push(d.url);
      return;
    }
    setError({ mensaje: d.mensaje, analisisId: d.analisisId });
    setFase("error");
  }

  return { fase, progreso, error, analizar };
}
