import type { AnalysisEvent } from "@/lib/analysis-events";
import { ETAPAS, type Etapa } from "@/schemas/analysis";

/**
 * Estado del análisis en el navegador como un REDUCER puro: cada evento del stream produce un
 * estado nuevo. Probado con Vitest y sin React; el hook solo lo conecta con useReducer.
 */

export type EstadoEtapa = "pendiente" | "running" | "done" | "error";

export interface ProgresoAnalisis {
  analisisId: string | null;
  etapas: Record<Etapa, EstadoEtapa>;
  mensajes: Partial<Record<Etapa, string>>;
  terminado: "COMPLETO" | "ERROR" | null;
  mensaje?: string;
  desdeCache?: boolean;
}

export const PROGRESO_INICIAL: ProgresoAnalisis = {
  analisisId: null,
  etapas: Object.fromEntries(ETAPAS.map((e) => [e, "pendiente"])) as Record<Etapa, EstadoEtapa>,
  mensajes: {},
  terminado: null,
};

export function aplicarEvento(estado: ProgresoAnalisis, e: AnalysisEvent): ProgresoAnalisis {
  switch (e.type) {
    case "start":
      return { ...estado, analisisId: e.analisisId };
    case "stage":
      return {
        ...estado,
        etapas: { ...estado.etapas, [e.etapa]: e.status },
        mensajes: e.message ? { ...estado.mensajes, [e.etapa]: e.message } : estado.mensajes,
      };
    case "done":
      return { ...estado, analisisId: e.analisisId, terminado: e.estado, mensaje: e.message, desdeCache: e.desdeCache };
    case "error":
      return { ...estado, terminado: "ERROR", mensaje: e.message };
  }
}

/** Qué hacer cuando termina el stream: ir a los resultados o mostrar el error (con enlace si quedó guardado). */
export type Desenlace = { tipo: "ir"; url: string } | { tipo: "error"; mensaje: string; analisisId: string | null };

export function desenlace(p: ProgresoAnalisis): Desenlace {
  if (p.terminado === "ERROR") return { tipo: "error", mensaje: p.mensaje ?? "No se pudo analizar el código.", analisisId: p.analisisId };
  // COMPLETO, o la conexión se cortó pero el análisis sigue en el servidor: la página de resultados se encarga.
  if (p.analisisId) return { tipo: "ir", url: `/analysis/${p.analisisId}${p.desdeCache ? "?cache=1" : ""}` };
  return { tipo: "error", mensaje: "La conexión se interrumpió. Revisa tu historial.", analisisId: null };
}
