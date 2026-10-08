import { dividirLineas, numerarLineas } from "@/lib/chunking";

/** Máximo de líneas que se envían enteras al LLM en el chat; por encima se manda una ventana. */
export const MAX_LINEAS_CONTEXTO_CHAT = 400;

/**
 * Prepara el contexto de código del chat (lógica pura, probada con Vitest):
 *  - código corto: completo,
 *  - código largo: ventana alrededor de la selección (o el inicio del archivo),
 * y el texto numerado de la selección, con el rango ya acotado al archivo.
 */
export function contextoChat(codigo: string, seleccion: { inicio: number; fin: number } | null) {
  const lineas = dividirLineas(codigo);
  const total = lineas.length;

  let sel: { inicio: number; fin: number; texto: string } | null = null;
  if (seleccion && seleccion.inicio <= total) {
    const inicio = Math.max(1, seleccion.inicio);
    const fin = Math.min(total, Math.max(inicio, seleccion.fin));
    sel = { inicio, fin, texto: numerarLineas(lineas.slice(inicio - 1, fin), inicio) };
  }

  if (total <= MAX_LINEAS_CONTEXTO_CHAT) {
    return { codigoNumerado: numerarLineas(lineas), seleccion: sel, recortado: false };
  }
  const centro = sel ? Math.floor((sel.inicio + sel.fin) / 2) : 1;
  const desde = Math.max(1, Math.min(centro - Math.floor(MAX_LINEAS_CONTEXTO_CHAT / 2), total - MAX_LINEAS_CONTEXTO_CHAT + 1));
  const hasta = Math.min(total, desde + MAX_LINEAS_CONTEXTO_CHAT - 1);
  return { codigoNumerado: numerarLineas(lineas.slice(desde - 1, hasta), desde), seleccion: sel, recortado: true };
}

/**
 * Normaliza la respuesta del LLM antes de guardarla (saltos de línea y longitud acotada).
 * No hace falta quitar HTML: se renderiza como texto con nodos de React, y quitar "<...>" rompería
 * explicaciones legítimas como `List<String>`.
 */
export function limpiarRespuestaChat(texto: string): string {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}
