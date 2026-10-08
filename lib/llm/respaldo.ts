import { LLMError, type LLMErrorCode, type LLMProvider, type LLMRequest, type LLMResponse } from "./types";

/** Errores en los que tiene sentido probar con otro proveedor (no dependen del prompt). */
const CODIGOS_CON_RESPALDO: LLMErrorCode[] = ["RATE_LIMIT", "UNAVAILABLE", "TIMEOUT", "AUTH", "CONFIG", "BLOCKED"];

/**
 * Patrón Decorator/Composite sobre la interfaz LLMProvider: intenta con el principal y, si falla por
 * límite, caída, timeout, clave inválida o modelo inexistente, repite la MISMA petición con el respaldo. Quien lo usa
 * (generadores y servicios) no sabe que hay dos proveedores.
 */
export class ProveedorConRespaldo implements LLMProvider {
  readonly name: string;
  readonly model: string;

  constructor(
    private readonly principal: LLMProvider,
    private readonly respaldo: LLMProvider,
    private readonly alCambiar: (error: LLMError) => void = (e) =>
      console.warn(`[llm] ${principal.name} falló (${e.code}); usando ${respaldo.name} como respaldo`),
  ) {
    this.name = `${principal.name}+${respaldo.name}`;
    this.model = `${principal.model} | ${respaldo.model}`;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      return await this.principal.generate(request);
    } catch (e) {
      if (!(e instanceof LLMError) || !CODIGOS_CON_RESPALDO.includes(e.code)) throw e;
      this.alCambiar(e);
      return this.respaldo.generate(request);
    }
  }
}
