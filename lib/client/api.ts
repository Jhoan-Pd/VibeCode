import { SIN_CONEXION } from "@/lib/mensajes";

/** Resultado de una llamada a la API desde el navegador: unión discriminada por `ok`, nunca lanza. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status: number | null };

export interface OpcionesPedido {
  metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Se envía como JSON. */
  cuerpo?: unknown;
  /** Mensaje si el servidor responde con error y no trae uno propio. */
  errorPorDefecto: string;
}

/**
 * Único punto donde los componentes hablan con /api: arma la petición JSON, lee la respuesta y
 * traduce cualquier fallo a un mensaje para mostrar (el del servidor, el por defecto o «sin conexión»).
 * Así cada componente solo decide qué hacer con `datos` o con `error`.
 */
export async function pedirJson<T>(url: string, { metodo = "POST", cuerpo, errorPorDefecto }: OpcionesPedido): Promise<Resultado<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: metodo,
      ...(cuerpo === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }),
    });
  } catch {
    return { ok: false, error: SIN_CONEXION, status: null };
  }
  const datos = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) return { ok: false, error: datos.error ?? errorPorDefecto, status: res.status };
  return { ok: true, datos };
}
