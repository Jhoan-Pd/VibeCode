"use client";

import { AnalysisViewer } from "@/components/analysis-viewer";
import { DEMO_PREGUNTAS, DEMO_VISTA } from "@/lib/demo";
import { calificar } from "@/lib/quiz";

/** Demo interactiva de la landing: datos precalculados, sin login y sin llamar al LLM. */
export function DemoViewer() {
  return <AnalysisViewer datos={DEMO_VISTA} calificarLocal={(respuestas) => calificar(DEMO_PREGUNTAS, respuestas)} />;
}
