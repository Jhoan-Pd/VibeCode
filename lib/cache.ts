/**
 * Reglas de la caché por hash (lógica pura, probada con Vitest).
 * Clave: SHA-256 del código normalizado + nivel (lib/hash.ts). Solo se reutiliza un análisis
 * COMPLETO de verdad y generado con la versión actual de los prompts: si los prompts cambian,
 * la caché se invalida sola.
 */

export interface CandidatoCache {
  estado: string;
  versionPrompts: string | null;
  tieneResumen: boolean;
  bloques: number;
  diagramaFlujo: boolean;
  conceptos: number;
  auditado: boolean;
  preguntas: number;
}

export function esReutilizable(c: CandidatoCache, versionActual: string): boolean {
  return (
    c.estado === "COMPLETO" &&
    c.versionPrompts === versionActual &&
    c.tieneResumen &&
    c.bloques > 0 &&
    c.diagramaFlujo &&
    c.conceptos > 0 &&
    c.auditado &&
    c.preguntas > 0
  );
}
