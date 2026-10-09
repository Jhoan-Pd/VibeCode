import { randomBytes } from "node:crypto";

/**
 * Tokens de los enlaces públicos. 24 bytes aleatorios (192 bits) en base64url = 32 caracteres:
 * imposible de adivinar por fuerza bruta. El token NO deriva del id del análisis.
 */
export const LARGO_TOKEN = 32;
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{32}$/;

export function generarTokenPublico(): string {
  return randomBytes(24).toString("base64url");
}

/** Se valida el formato antes de consultar la BD (corta peticiones basura sin tocar Postgres). */
export function esTokenValido(token: unknown): token is string {
  return typeof token === "string" && FORMATO_TOKEN.test(token);
}

export function urlPublica(origen: string, token: string): string {
  return `${origen.replace(/\/+$/, "")}/c/${token}`;
}
