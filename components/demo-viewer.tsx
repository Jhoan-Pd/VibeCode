"use client";

import { AnalysisViewer } from "@/components/analysis-viewer";
import { DEMO_ANALISIS } from "@/lib/demo";

/** Demo interactiva de la landing: datos precalculados, sin login y sin llamar al LLM. */
export function DemoViewer() {
  return (
    <AnalysisViewer
      codigo={DEMO_ANALISIS.codigo}
      lenguaje={DEMO_ANALISIS.lenguaje}
      resumen={DEMO_ANALISIS.resumen}
      bloques={DEMO_ANALISIS.bloques}
      diagrama={DEMO_ANALISIS.diagrama}
    />
  );
}
