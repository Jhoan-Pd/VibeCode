import type { AnalysisEvent } from "@/lib/analysis-events";

export interface AnalyzePayload {
  codigo: string;
  lenguaje: string;
  nivel: string;
  titulo?: string;
}

/**
 * Llama a /api/analyze y entrega cada evento NDJSON a `onEvent` a medida que llega.
 * Lanza Error con un mensaje legible si el servidor responde con un error HTTP.
 */
export async function analizarConStream(payload: AnalyzePayload, onEvent: (e: AnalysisEvent) => void): Promise<void> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `El servidor respondió ${res.status}`);
  }
  if (!res.body) throw new Error("El navegador no soporta streaming de respuestas.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let salto: number;
    while ((salto = buffer.indexOf("\n")) >= 0) {
      const linea = buffer.slice(0, salto).trim();
      buffer = buffer.slice(salto + 1);
      if (linea) onEvent(JSON.parse(linea) as AnalysisEvent);
    }
  }
}
