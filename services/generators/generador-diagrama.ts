import { dividirLineas, numerarLineas } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { normalizarMermaid, validarMermaidBasico } from "@/lib/mermaid";
import { SISTEMA_BASE, promptDiagrama, promptRepararDiagrama } from "@/lib/prompts";
import { DiagramaSchema, type DiagramaLLM } from "@/schemas/analysis";
import { GeneradorBase } from "./generador-base";
import type { EntradaCodigo } from "./generador-explicacion";

/**
 * Genera diagramas Mermaid. Fase 1: diagrama de flujo.
 * (Fase 2: diagrama de clases si el código es orientado a objetos y de secuencia si hay llamadas entre servicios.)
 */
export class GeneradorDiagrama extends GeneradorBase {
  async generarFlujo(entrada: EntradaCodigo): Promise<DiagramaLLM> {
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptDiagrama({
        codigoNumerado: numerarLineas(dividirLineas(entrada.codigo)),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
      }),
      schema: DiagramaSchema,
      validate: (d) => validarMermaidBasico(normalizarMermaid(d.mermaid)),
      maxOutputTokens: 4096,
    });
    return { titulo: data.titulo, mermaid: normalizarMermaid(data.mermaid) };
  }

  /** Pide al LLM corregir un diagrama que el parser del cliente rechazó. */
  async reparar(mermaid: string, error: string): Promise<DiagramaLLM> {
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptRepararDiagrama({ mermaid, error }),
      schema: DiagramaSchema,
      validate: (d) => validarMermaidBasico(normalizarMermaid(d.mermaid)),
      maxOutputTokens: 4096,
    });
    return { titulo: data.titulo, mermaid: normalizarMermaid(data.mermaid) };
  }
}
