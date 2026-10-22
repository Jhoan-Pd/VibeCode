import "server-only";
import type { AnalysisEvent } from "@/lib/analysis-events";
import { hashCodigo } from "@/lib/hash";
import { LLMError, mensajeAmigable, type LLMProvider } from "@/lib/llm/types";
import type { TipoMermaid } from "@/lib/mermaid";
import { resolverMetadatos } from "@/lib/metadatos";
import { PROMPT_VERSION } from "@/lib/prompts";
import { ETAPAS, type AnalyzeRequest, type Etapa } from "@/schemas/analysis";
import { analisisRepo, type EstadoFinal } from "./analisis.repo";
import { AuditorCodigo } from "./generators/auditor-codigo";
import type { EntradaCodigo } from "./generators/generador-base";
import { GeneradorDiagrama } from "./generators/generador-diagrama";
import { GeneradorExplicacion } from "./generators/generador-explicacion";
import { GeneradorQuiz } from "./generators/generador-quiz";

export { resolverMetadatos } from "@/lib/metadatos";

type Emitir = (evento: AnalysisEvent) => void;
const SIN_EVENTOS: Emitir = () => {};

/** Estrategia de una etapa: generar con el LLM y guardar el resultado. */
type EstrategiaEtapa = (analisisId: string, entrada: EntradaCodigo) => Promise<void>;

/**
 * Orquesta el análisis: crea el registro, ejecuta las etapas y persiste cada resultado.
 * Las etapas son independientes entre sí (todas parten del código), así que se ejecutan EN PARALELO:
 * baja la latencia total (importante por el timeout de las funciones serverless) y, si una falla
 * (p. ej. el diagrama), el usuario conserva el resto y puede regenerar solo esa etapa.
 *
 * Patrón Strategy: cada etapa es una función del registro `estrategias`. Al ser un
 * `Record<Etapa, …>`, TypeScript exige una estrategia por etapa (no hace falta un `switch`
 * con caso por defecto) y agregar una etapa nueva es agregar una entrada.
 */
export class AnalisisService {
  private readonly estrategias: Record<Etapa, EstrategiaEtapa>;
  private readonly diagrama: GeneradorDiagrama;

  constructor(private readonly provider: LLMProvider) {
    const explicacion = new GeneradorExplicacion(provider);
    const diagrama = new GeneradorDiagrama(provider);
    const quiz = new GeneradorQuiz(provider);
    const auditor = new AuditorCodigo(provider);
    this.diagrama = diagrama;

    this.estrategias = {
      resumen: async (id, e) => analisisRepo.guardarResumen(id, await explicacion.generarResumen(e)),
      lineas: async (id, e) => analisisRepo.reemplazarBloques(id, await explicacion.generarBloques(e)),
      diagrama: async (id, e) => {
        // El de flujo es obligatorio; los de clases/secuencia son un extra: si fallan, no tumban la etapa.
        const [flujo, extras] = await Promise.allSettled([diagrama.generarFlujo(e), diagrama.generarEstructurales(e)]);
        if (flujo.status === "rejected") throw flujo.reason;
        await analisisRepo.guardarFlujo(id, flujo.value);
        if (extras.status === "fulfilled") await analisisRepo.reemplazarEstructurales(id, extras.value);
        else console.error(`[analisis ${id}] diagramas de clases/secuencia fallaron:`, extras.reason);
      },
      glosario: async (id, e) => analisisRepo.reemplazarConceptos(id, await explicacion.generarGlosario(e)),
      auditoria: async (id, e) => analisisRepo.reemplazarHallazgos(id, await auditor.auditar(e)),
      quiz: async (id, e) => analisisRepo.crearQuiz(id, await quiz.generar(e)),
    };
  }

  /** Crea el registro en estado PROCESANDO. Resuelve el lenguaje si el usuario eligió "auto". */
  async crear(usuarioId: string, input: AnalyzeRequest) {
    const { lenguaje, titulo } = resolverMetadatos(input);
    return analisisRepo.crear({
      usuarioId,
      titulo,
      codigo: input.codigo,
      lenguaje,
      nivel: input.nivel,
      hash: hashCodigo(input.codigo, input.nivel),
      versionPrompts: PROMPT_VERSION,
      estado: "PROCESANDO",
      modelo: `${this.provider.name}:${this.provider.model}`,
    });
  }

  /** Ejecuta todas las etapas y deja el análisis en COMPLETO o ERROR. Nunca lanza: reporta por `emitir`. */
  async ejecutar(analisisId: string, emitir: Emitir = SIN_EVENTOS): Promise<EstadoFinal> {
    const entrada = await analisisRepo.cargarEntrada(analisisId);
    if (!entrada) {
      emitir({ type: "error", message: "Análisis no encontrado" });
      return "ERROR";
    }

    const resultados = await Promise.all(ETAPAS.map((etapa) => this.ejecutarEtapa(analisisId, etapa, entrada, emitir)));
    const errores = resultados.filter((r): r is string => r !== null);
    const estado: EstadoFinal = errores.length === ETAPAS.length ? "ERROR" : "COMPLETO";

    await analisisRepo.marcarEstado(analisisId, estado, errores.length > 0 ? [...new Set(errores)].join(" ") : null);
    emitir({ type: "done", analisisId, estado, message: errores[0] });
    return estado;
  }

  /** Regenera una sola etapa (botón "Reintentar" cuando falló o quedó incompleta). Devuelve el error o null. */
  async regenerarEtapa(analisisId: string, etapa: Etapa): Promise<string | null> {
    const entrada = await analisisRepo.cargarEntrada(analisisId);
    if (!entrada) return "Análisis no encontrado";
    const error = await this.ejecutarEtapa(analisisId, etapa, entrada, SIN_EVENTOS);
    // El estado global se recalcula a partir de lo que hay guardado.
    const estado: EstadoFinal = (await analisisRepo.tieneResultados(analisisId)) ? "COMPLETO" : "ERROR";
    await analisisRepo.marcarEstado(analisisId, estado, error);
    return error;
  }

  /** Reemplaza el diagrama por una versión corregida por el LLM tras un error de parseo en el cliente. */
  async repararDiagrama(analisisId: string, errorParser: string, tipo: TipoMermaid = "FLUJO") {
    const actual = await analisisRepo.buscarDiagrama(analisisId, tipo);
    if (!actual) return null;
    const corregido = await this.diagrama.reparar(actual.codigoMermaid, errorParser, tipo);
    return analisisRepo.actualizarDiagrama(actual.id, corregido);
  }

  /** Ejecuta una estrategia y traduce su resultado a eventos. Devuelve null si salió bien, o el mensaje amigable. */
  private async ejecutarEtapa(analisisId: string, etapa: Etapa, entrada: EntradaCodigo, emitir: Emitir): Promise<string | null> {
    emitir({ type: "stage", etapa, status: "running" });
    try {
      await this.estrategias[etapa](analisisId, entrada);
      emitir({ type: "stage", etapa, status: "done" });
      return null;
    } catch (error) {
      const mensaje = mensajeAmigable(error);
      // Los detalles técnicos se quedan en el log del servidor; al usuario solo le llega el mensaje amigable.
      console.error(`[analisis ${analisisId}] etapa "${etapa}" falló:`, error instanceof LLMError ? `${error.code} ${error.detalle ?? ""}` : error);
      emitir({ type: "stage", etapa, status: "error", message: mensaje });
      return mensaje;
    }
  }
}
