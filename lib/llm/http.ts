import { LLM_TIMEOUT_MS } from "@/lib/config";
import { sleep } from "@/lib/utils";
import { LLMError, type LLMProvider, type LLMRequest, type LLMResponse } from "./types";

export interface OpcionesProveedorHttp {
  apiKey: string;
  model: string;
  /** Permite apuntar a otro host (pruebas con un servidor simulado). */
  baseUrl?: string;
  timeoutMs?: number;
}

/** Lo que cada proveedor sabe de sí mismo: nombre visible, host por defecto y variable de su clave. */
export interface DescripcionProveedor {
  name: string;
  etiqueta: string;
  urlPorDefecto: string;
  variableClave: string;
}

export interface PeticionHttp {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

const MAX_INTENTOS = 3;
/** Un 429 solo se reintenta si la espera sugerida por el proveedor es corta. */
const ESPERA_MAXIMA_MS = 15_000;

/** "12s" o "12" → 12000 ms; null si no es un número. */
export function segundosAMs(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const s = Number.parseFloat(valor);
  return Number.isFinite(s) ? Math.round(s * 1000) : null;
}

/**
 * Patrón Template Method para los proveedores REST. La base define el algoritmo común —POST con
 * timeout, hasta 3 intentos para errores transitorios (429 con espera corta y 5xx con backoff),
 * traducción de los códigos HTTP comunes a `LLMError`— y cada subclase aporta solo lo propio:
 * cómo armar la petición, cómo leer la respuesta y los errores particulares de su API.
 */
export abstract class ProveedorHttp<Cuerpo> implements LLMProvider {
  readonly name: string;
  readonly model: string;
  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly etiqueta: string;
  private readonly timeoutMs: number;

  protected constructor(descripcion: DescripcionProveedor, opciones: OpcionesProveedorHttp) {
    if (!opciones.apiKey) throw new LLMError(`Falta ${descripcion.variableClave} en las variables de entorno del servidor.`, "AUTH");
    this.name = descripcion.name;
    this.etiqueta = descripcion.etiqueta;
    this.apiKey = opciones.apiKey;
    this.model = opciones.model;
    this.baseUrl = (opciones.baseUrl ?? descripcion.urlPorDefecto).replace(/\/$/, "");
    this.timeoutMs = opciones.timeoutMs ?? LLM_TIMEOUT_MS;
  }

  /** URL, cabeceras (con la clave) y cuerpo en el formato de la API. */
  protected abstract peticion(request: LLMRequest): PeticionHttp;
  /** Traduce una respuesta 2xx al formato común (o lanza si viene vacía o bloqueada). */
  protected abstract interpretar(data: Cuerpo): LLMResponse;
  /** Mensaje de error que trae el cuerpo, si lo hay. */
  protected abstract mensajeDeError(data: Cuerpo): string | undefined;
  /** Errores propios de la API que se revisan antes que los genéricos; null si no aplica ninguno. */
  protected abstract errorEspecifico(status: number, data: Cuerpo, detalle: string | undefined): LLMError | null;
  /** Milisegundos que el proveedor pide esperar tras un 429; null si no lo indica. */
  protected abstract esperaSugerida(res: Response, data: Cuerpo): number | null;

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { url, headers, body } = this.peticion(request);
    const cuerpoJson = JSON.stringify(body);

    for (let intento = 1; ; intento++) {
      const res = await this.enviar(url, headers, cuerpoJson, request.signal);
      const data = (await res.json().catch(() => ({}))) as Cuerpo;
      if (res.ok) return this.interpretar(data);

      const quedanIntentos = intento < MAX_INTENTOS;
      const detalle = this.mensajeDeError(data)?.slice(0, 300);
      const especifico = this.errorEspecifico(res.status, data, detalle);
      if (especifico) throw especifico;

      if (res.status === 401 || res.status === 403) throw new LLMError(`${this.etiqueta} rechazó la clave`, "AUTH", detalle);

      if (res.status === 429) {
        const espera = this.esperaSugerida(res, data);
        if (espera !== null && espera <= ESPERA_MAXIMA_MS && quedanIntentos) {
          await sleep(espera + 250);
          continue;
        }
        throw new LLMError(`Límite de uso de ${this.etiqueta} alcanzado`, "RATE_LIMIT", detalle);
      }

      if (res.status >= 500) {
        if (quedanIntentos) {
          await sleep(1200 * intento + Math.random() * 400);
          continue;
        }
        throw new LLMError(`${this.etiqueta} no disponible`, "UNAVAILABLE", detalle);
      }

      throw new LLMError(`${this.etiqueta} respondió ${res.status}`, "BAD_RESPONSE", detalle);
    }
  }

  /** POST con timeout propio (combinado con el `signal` de quien llama). Los fallos de red se traducen a LLMError. */
  private async enviar(url: string, headers: Record<string, string>, body: string, signal?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new LLMError(`Timeout llamando a ${this.etiqueta}`, "TIMEOUT");
      throw new LLMError(`No se pudo contactar a ${this.etiqueta}`, "UNAVAILABLE", e instanceof Error ? e.message : undefined);
    }
  }
}
