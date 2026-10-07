import { CHUNK_LINES } from "@/lib/config";
import { dividirEnBloques, dividirLineas, numerarLineas, type BloqueCodigo } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { SISTEMA_BASE, promptExplicacion, promptResumen } from "@/lib/prompts";
import { BloquesSchema, ResumenSchema, type Bloque, type Resumen } from "@/schemas/analysis";
import type { NivelUsuario } from "@/schemas/common";
import { GeneradorBase } from "./generador-base";
import { repararSolapes, validarBloques } from "./validacion";

export interface EntradaCodigo {
  codigo: string;
  lenguaje: string;
  nivel: NivelUsuario;
}

/** Genera el resumen general y la explicación línea por línea (por bloques lógicos). */
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
