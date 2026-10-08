import { CHUNK_LINES } from "@/lib/config";
import { dividirEnBloques, dividirLineas, numerarLineas, type BloqueCodigo } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { SISTEMA_BASE, promptExplicacion, promptGlosario, promptResumen } from "@/lib/prompts";
import { BloquesSchema, GlosarioSchema, ResumenSchema, type Bloque, type ConceptoLLM, type Resumen } from "@/schemas/analysis";
import type { NivelUsuario } from "@/schemas/common";
import { GeneradorBase } from "./generador-base";
import { normalizarRango, repararSolapes, validarBloques, validarRangosOpcionales } from "./validacion";

export type Concepto = ReturnType<typeof normalizarRango<ConceptoLLM>>;

export interface EntradaCodigo {
  codigo: string;
  lenguaje: string;
  nivel: NivelUsuario;
}

/** Genera el resumen general, la explicación línea por línea (por bloques lógicos) y el glosario. */
export class GeneradorExplicacion extends GeneradorBase {
  async generarResumen(entrada: EntradaCodigo): Promise<Resumen> {
    const lineas = dividirLineas(entrada.codigo);
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptResumen({
        codigoNumerado: numerarLineas(lineas),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
      }),
      schema: ResumenSchema,
      maxOutputTokens: 2048,
    });
    return data;
  }

  /** Glosario de conceptos que aparecen en el código, con la primera línea donde se usan. */
  async generarGlosario(entrada: EntradaCodigo): Promise<Concepto[]> {
    const lineas = dividirLineas(entrada.codigo);
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptGlosario({
        codigoNumerado: numerarLineas(lineas),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
        totalLineas: lineas.length,
      }),
      schema: GlosarioSchema,
      validate: (d) => validarRangosOpcionales(d.conceptos, lineas.length, "concepto"),
      maxOutputTokens: 4096,
    });
    // Quita duplicados por nombre (el LLM a veces repite "async/await" y "Async/Await").
    const vistos = new Set<string>();
    return data.conceptos
      .filter((c) => {
        const clave = c.nombre.toLowerCase();
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      })
      .map(normalizarRango);
  }

  /**
   * Divide el código en bloques de CHUNK_LINES líneas (para no exceder los tokens de salida),
   * explica cada uno con concurrencia limitada y devuelve todo ordenado por línea.
   */
  async generarBloques(entrada: EntradaCodigo, opciones: { maxLineasPorBloque?: number; concurrencia?: number } = {}): Promise<Bloque[]> {
    const lineas = dividirLineas(entrada.codigo);
    const chunks = dividirEnBloques(entrada.codigo, opciones.maxLineasPorBloque ?? CHUNK_LINES);
    const resultados = await mapConConcurrencia(chunks, opciones.concurrencia ?? 2, (chunk) =>
      this.explicarChunk(entrada, chunk, lineas.length),
    );
    return resultados.flat().sort((a, b) => a.lineaInicio - b.lineaInicio);
  }

  private async explicarChunk(entrada: EntradaCodigo, chunk: BloqueCodigo, totalLineas: number): Promise<Bloque[]> {
    const rango = { inicio: chunk.inicio, fin: chunk.fin };
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptExplicacion({
        codigoNumerado: numerarLineas(chunk.lineas, chunk.inicio),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
        inicio: chunk.inicio,
        fin: chunk.fin,
        totalLineas,
      }),
      schema: BloquesSchema,
      // Los solapes se corrigen de forma determinista; rango y cobertura se validan (y reintentan).
      validate: (d) => validarBloques(repararSolapes(d.bloques), rango, chunk.lineas),
      maxOutputTokens: 8192,
    });
    return repararSolapes(data.bloques);
  }
}

/** Ejecuta `fn` sobre cada elemento con como máximo `limite` tareas simultáneas, conservando el orden. */
export async function mapConConcurrencia<T, R>(items: T[], limite: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(items.length);
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (true) {
      const i = siguiente++;
      if (i >= items.length) return;
      resultados[i] = await fn(items[i], i);
    }
  });
  await Promise.all(trabajadores);
  return resultados;
}
