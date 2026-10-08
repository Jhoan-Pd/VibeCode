/**
 * Lógica pura del límite diario (sin BD), probada con Vitest.
 * El contador vive en la tabla uso_diario: una fila por usuario y día.
 */

export type Recurso = "analisis" | "consultas";

/** Día "YYYY-MM-DD" en la zona horaria indicada (el contador se reinicia a medianoche local). */
export function fechaClave(fecha: Date, zonaHoraria: string): string {
  try {
    // en-CA da el formato ISO AAAA-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone: zonaHoraria, year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
  } catch {
    return fecha.toISOString().slice(0, 10); // zona inválida: UTC
  }
}

export interface EstadoCupo {
  usados: number;
  limite: number;
  restantes: number;
}

export function estadoCupo(usados: number, limite: number): EstadoCupo {
  return { usados, limite, restantes: Math.max(0, limite - usados) };
}

export function mensajeLimite(recurso: Recurso, limite: number): string {
  return recurso === "analisis"
    ? `Llegaste al límite de ${limite} análisis nuevos por día. Mañana se reinicia; mientras tanto puedes revisar tu historial o volver a abrir códigos ya analizados (salen de la caché y no cuentan).`
    : `Llegaste al límite de ${limite} consultas a la IA por día (chat, regenerar secciones y quizzes nuevos). Mañana se reinicia.`;
}
