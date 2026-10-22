import { dividirLineas, numerarLineas } from "@/lib/chunking";
import { generateJson, type GenerateJsonOptions } from "@/lib/llm/json";
import type { LLMProvider } from "@/lib/llm/types";
import { SISTEMA_BASE } from "@/lib/prompts";
import type { NivelUsuario } from "@/schemas/common";

/** Lo que todo generador recibe: el código del análisis y el nivel de la persona. */
export interface EntradaCodigo {
  codigo: string;
  lenguaje: string;
  nivel: NivelUsuario;
}

/** El código ya preparado para un prompt: líneas, texto numerado y total. */
export interface CodigoPreparado extends EntradaCodigo {
  lineas: string[];
  codigoNumerado: string;
  totalLineas: number;
}

type OpcionesConsulta<T> = Omit<GenerateJsonOptions<T>, "provider" | "system"> & { system?: string };

/**
 * Clase base de los generadores (POO + patrón Template Method). Recibe el proveedor por inyección
 * de dependencias: los generadores dependen de la INTERFAZ LLMProvider, no de Gemini ni de Groq.
 * Fija los pasos comunes (preparar el código numerado y pedir JSON validado con el prompt de
 * sistema) y cada subclase solo aporta su prompt, su esquema y su validación.
 * Subclases: GeneradorExplicacion, GeneradorDiagrama, GeneradorQuiz y AuditorCodigo.
 */
export abstract class GeneradorBase {
  constructor(protected readonly provider: LLMProvider) {}

  protected preparar(entrada: EntradaCodigo): CodigoPreparado {
    const lineas = dividirLineas(entrada.codigo);
    return { ...entrada, lineas, codigoNumerado: numerarLineas(lineas), totalLineas: lineas.length };
  }

  /** Pide JSON al LLM con el prompt de sistema común y devuelve solo los datos validados. */
  protected async consultar<T>(opciones: OpcionesConsulta<T>): Promise<T> {
    const { data } = await generateJson({ provider: this.provider, system: SISTEMA_BASE, ...opciones });
    return data;
  }
}
