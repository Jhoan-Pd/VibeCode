import type { LLMProvider } from "@/lib/llm/types";

/**
 * Clase base de los generadores (POO). Recibe el proveedor por inyección de dependencias:
 * los generadores dependen de la INTERFAZ LLMProvider, no de Gemini ni de Groq.
 * Fase 2 añadirá GeneradorQuiz y AuditorCodigo sobre esta misma base.
 */
export abstract class GeneradorBase {
  constructor(protected readonly provider: LLMProvider) {}
}
