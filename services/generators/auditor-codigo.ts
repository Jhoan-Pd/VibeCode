import { dividirLineas, numerarLineas } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { SISTEMA_BASE, promptAuditoria } from "@/lib/prompts";
import { AuditoriaSchema, SEVERIDADES, type HallazgoLLM } from "@/schemas/analysis";
import { GeneradorBase } from "./generador-base";
import type { EntradaCodigo } from "./generador-explicacion";
import { normalizarRango, validarRangosOpcionales } from "./validacion";

export type Hallazgo = ReturnType<typeof normalizarRango<HallazgoLLM>>;

/** Peso para ordenar: CRITICA primero. */
export const PESO_SEVERIDAD: Record<(typeof SEVERIDADES)[number], number> = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };

/**
 * Auditoría de "vibe code": seguridad, malas prácticas, código muerto, manejo de errores
 * y posibles alucinaciones de la IA (APIs inexistentes o deprecadas).
 * Una lista vacía es una respuesta válida: no se fuerzan hallazgos.
 */
export class AuditorCodigo extends GeneradorBase {
  async auditar(entrada: EntradaCodigo): Promise<Hallazgo[]> {
    const lineas = dividirLineas(entrada.codigo);
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptAuditoria({
        codigoNumerado: numerarLineas(lineas),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
        totalLineas: lineas.length,
      }),
      schema: AuditoriaSchema,
      validate: (d) => validarRangosOpcionales(d.hallazgos, lineas.length, "hallazgo"),
      maxOutputTokens: 6144,
    });
    return ordenarHallazgos(data.hallazgos.map(normalizarRango));
  }
}

/** Ordena por severidad (mayor primero) y luego por línea. Lógica pura, probada con Vitest. */
export function ordenarHallazgos<T extends { severidad: keyof typeof PESO_SEVERIDAD; lineaInicio: number | null }>(hallazgos: T[]): T[] {
  return [...hallazgos].sort(
    (a, b) => PESO_SEVERIDAD[b.severidad] - PESO_SEVERIDAD[a.severidad] || (a.lineaInicio ?? Infinity) - (b.lineaInicio ?? Infinity),
  );
}
