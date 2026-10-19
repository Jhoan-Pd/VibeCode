import type { CSSProperties } from "react";

/**
 * Retraso escalonado para animaciones de entrada: el elemento `i` entra `pasoMs` después del anterior.
 * Se limita a 6 pasos para que una lista larga no tarde en aparecer. Módulo sin "use client":
 * se puede usar tanto en componentes de servidor como de cliente.
 */
export function retraso(i: number, pasoMs = 70): CSSProperties {
  return { ["--vd-delay" as string]: `${Math.min(i, 6) * pasoMs}ms` } as CSSProperties;
}
