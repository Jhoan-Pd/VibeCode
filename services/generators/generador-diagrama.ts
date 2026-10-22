import { normalizarMermaid, validarMermaidBasico, type TipoMermaid } from "@/lib/mermaid";
import { promptDiagrama, promptDiagramasEstructurales, promptRepararDiagrama } from "@/lib/prompts";
import { DiagramaSchema, DiagramasEstructuralesSchema, type DiagramaLLM } from "@/schemas/analysis";
import { GeneradorBase, type EntradaCodigo } from "./generador-base";

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
    const data = await this.consultar({
      prompt: promptDiagrama(this.preparar(entrada)),
      schema: DiagramaSchema,
      validate: (d) => validarMermaidBasico(normalizarMermaid(d.mermaid)),
      maxOutputTokens: 4096,
    });
    return diagrama("FLUJO", data);
  }

  /** Diagramas de clases y de secuencia (0, 1 o 2 según el código). */
  async generarEstructurales(entrada: EntradaCodigo): Promise<DiagramaGenerado[]> {
    const data = await this.consultar({
      prompt: promptDiagramasEstructurales(this.preparar(entrada)),
      schema: DiagramasEstructuralesSchema,
      validate: (d) => [...problemas("CLASES", d.clases), ...problemas("SECUENCIA", d.secuencia)],
      maxOutputTokens: 6144,
    });
    const candidatos: [TipoMermaid, DiagramaLLM | null][] = [
      ["CLASES", data.clases],
      ["SECUENCIA", data.secuencia],
    ];
    return candidatos.flatMap(([tipo, d]) => (d ? [diagrama(tipo, d)] : []));
  }

  /** Pide al LLM corregir un diagrama que el parser del cliente rechazó. */
  async reparar(mermaid: string, error: string, tipo: TipoMermaid = "FLUJO"): Promise<DiagramaGenerado> {
    const data = await this.consultar({
      prompt: promptRepararDiagrama({ mermaid, error, tipo }),
      schema: DiagramaSchema,
      validate: (d) => validarMermaidBasico(normalizarMermaid(d.mermaid, tipo), tipo),
      maxOutputTokens: 4096,
    });
    return diagrama(tipo, data);
  }
}

/** Diagrama listo para guardar: el Mermaid se normaliza según su tipo. */
function diagrama(tipo: TipoMermaid, d: DiagramaLLM): DiagramaGenerado {
  return { tipo, titulo: d.titulo, mermaid: normalizarMermaid(d.mermaid, tipo) };
}

/** Problemas de un diagrama opcional, prefijados con su tipo para que el reintento sepa cuál corregir. */
function problemas(tipo: TipoMermaid, d: DiagramaLLM | null | undefined): string[] {
  if (!d) return [];
  return validarMermaidBasico(normalizarMermaid(d.mermaid, tipo), tipo).map((p) => `${tipo.toLowerCase()}: ${p}`);
}
