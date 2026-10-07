import { createHash } from "node:crypto";

/** Normaliza saltos de línea y espacios finales para que el mismo código dé siempre el mismo hash. */
export function normalizarCodigo(codigo: string): string {
  return codigo
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\s+$/, "");
}

/**
 * SHA-256 del código normalizado + nivel. Es la clave de caché (se usa en la Fase 2):
 * mismo código y mismo nivel => no hace falta volver a llamar al LLM.
 */
export function hashCodigo(codigo: string, nivel: string): string {
  return createHash("sha256").update(normalizarCodigo(codigo)).update("\u0000").update(nivel).digest("hex");
}
