import type { Etapa } from "@/schemas/analysis";

/** Eventos que el servidor envía por streaming (NDJSON) mientras analiza. Módulo seguro para cliente. */
export type AnalysisEvent =
  | { type: "start"; analisisId: string }
  | { type: "stage"; etapa: Etapa; status: "running" | "done" | "error"; message?: string }
  | { type: "done"; analisisId: string; estado: "COMPLETO" | "ERROR"; message?: string }
  | { type: "error"; message: string };

export const ETAPAS_UI: { id: Etapa; label: string; detalle: string }[] = [
  { id: "resumen", label: "Resumen general", detalle: "Qué hace, entradas, salidas y dependencias" },
  { id: "lineas", label: "Explicación línea por línea", detalle: "Bloques lógicos adaptados a tu nivel" },
  { id: "diagrama", label: "Diagrama de flujo", detalle: "Mermaid del flujo de ejecución" },
];
