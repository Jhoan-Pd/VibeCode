import { dividirLineas, numerarLineas } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { normalizarMermaid, validarMermaidBasico, type TipoMermaid } from "@/lib/mermaid";
import { SISTEMA_BASE, promptDiagrama, promptDiagramasEstructurales, promptRepararDiagrama } from "@/lib/prompts";
import { DiagramaSchema, DiagramasEstructuralesSchema, type DiagramaLLM } from "@/schemas/analysis";
import { GeneradorBase } from "./generador-base";
import type { EntradaCodigo } from "./generador-explicacion";

export interface DiagramaGenerado extends DiagramaLLM {
  tipo: TipoMermaid;
}

/**
 * Genera diagramas Mermaid:
 *  - de flujo (siempre),
 *  - de clases si el código es orientado a objetos y de secuencia si hay llamadas entre
 *    funciones/servicios (el LLM decide si aplican y devuelve null si no).
 */
export class GeneradorDiagrama extends GeneradorBase {
  async generarFlujo(entrada: EntradaCodigo): Promise<DiagramaGenerado> {
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
    return { tipo: "FLUJO", titulo: data.titulo, mermaid: normalizarMermaid(data.mermaid) };
  }

  /** Diagramas de clases y de secuencia (0, 1 o 2 según el código). */
  async generarEstructurales(entrada: EntradaCodigo): Promise<DiagramaGenerado[]> {
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptDiagramasEstructurales({
        codigoNumerado: numerarLineas(dividirLineas(entrada.codigo)),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
      }),
      schema: DiagramasEstructuralesSchema,
      validate: (d) => [
        ...(d.clases ? validarMermaidBasico(normalizarMermaid(d.clases.mermaid, "CLASES"), "CLASES").map((p) => `clases: ${p}`) : []),
        ...(d.secuencia ? validarMermaidBasico(normalizarMermaid(d.secuencia.mermaid, "SECUENCIA"), "SECUENCIA").map((p) => `secuencia: ${p}`) : []),
      ],
      maxOutputTokens: 6144,
    });
    const resultado: DiagramaGenerado[] = [];
    if (data.clases) resultado.push({ tipo: "CLASES", titulo: data.clases.titulo, mermaid: normalizarMermaid(data.clases.mermaid, "CLASES") });
    if (data.secuencia) {
      resultado.push({ tipo: "SECUENCIA", titulo: data.secuencia.titulo, mermaid: normalizarMermaid(data.secuencia.mermaid, "SECUENCIA") });
    }
    return resultado;
  }

  /** Pide al LLM corregir un diagrama que el parser del cliente rechazó. */
  async reparar(mermaid: string, error: string, tipo: TipoMermaid = "FLUJO"): Promise<DiagramaGenerado> {
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptRepararDiagrama({ mermaid, error, tipo }),
      schema: DiagramaSchema,
      validate: (d) => validarMermaidBasico(normalizarMermaid(d.mermaid, tipo), tipo),
      maxOutputTokens: 4096,
    });
    return { tipo, titulo: data.titulo, mermaid: normalizarMermaid(data.mermaid, tipo) };
  }
}
