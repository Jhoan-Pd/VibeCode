import { dividirEnBloques, numerarLineas, type BloqueCodigo } from "@/lib/chunking";
import { unicosPor } from "@/lib/colecciones";
import { mapConConcurrencia } from "@/lib/concurrencia";
import { CHUNK_LINES } from "@/lib/config";
import { promptExplicacion, promptGlosario, promptResumen } from "@/lib/prompts";
import { BloquesSchema, GlosarioSchema, ResumenSchema, type Bloque, type ConceptoLLM, type Resumen } from "@/schemas/analysis";
import { GeneradorBase, type EntradaCodigo } from "./generador-base";
import { ajustarRango, normalizarRango, repararSolapes, validarBloques } from "./validacion";

export type { EntradaCodigo } from "./generador-base";
export type Concepto = ReturnType<typeof normalizarRango<ConceptoLLM>>;

/** Bloques que se explican a la vez (el resto espera turno): protege el límite por minuto del plan gratuito. */
const CONCURRENCIA_BLOQUES = 2;

/** Genera el resumen general, la explicación línea por línea (por bloques lógicos) y el glosario. */
export class GeneradorExplicacion extends GeneradorBase {
  async generarResumen(entrada: EntradaCodigo): Promise<Resumen> {
    return this.consultar({ prompt: promptResumen(this.preparar(entrada)), schema: ResumenSchema, maxOutputTokens: 2048 });
  }

  /** Glosario de conceptos que aparecen en el código, con la primera línea donde se usan. */
  async generarGlosario(entrada: EntradaCodigo): Promise<Concepto[]> {
    const codigo = this.preparar(entrada);
    const data = await this.consultar({ prompt: promptGlosario(codigo), schema: GlosarioSchema, maxOutputTokens: 4096 });
    // El LLM a veces repite un concepto con otra capitalización ("async/await" y "Async/Await").
    return unicosPor(data.conceptos, (c) => c.nombre.toLowerCase()).map((c) => ajustarRango(c, codigo.totalLineas));
  }

  /**
   * Divide el código en bloques de CHUNK_LINES líneas (para no exceder los tokens de salida),
   * explica cada uno con concurrencia limitada y devuelve todo ordenado por línea.
   */
  async generarBloques(entrada: EntradaCodigo, opciones: { maxLineasPorBloque?: number; concurrencia?: number } = {}): Promise<Bloque[]> {
    const { totalLineas } = this.preparar(entrada);
    const chunks = dividirEnBloques(entrada.codigo, opciones.maxLineasPorBloque ?? CHUNK_LINES);
    const resultados = await mapConConcurrencia(chunks, opciones.concurrencia ?? CONCURRENCIA_BLOQUES, (chunk) =>
      this.explicarChunk(entrada, chunk, totalLineas),
    );
    return resultados.flat().sort((a, b) => a.lineaInicio - b.lineaInicio);
  }

  private async explicarChunk(entrada: EntradaCodigo, chunk: BloqueCodigo, totalLineas: number): Promise<Bloque[]> {
    const rango = { inicio: chunk.inicio, fin: chunk.fin };
    const data = await this.consultar({
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
