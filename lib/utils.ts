import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos (patrón de shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Configuración regional de toda la interfaz (fechas y números). */
export const LOCALE = "es-CO";

const fechaFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatearFecha(fecha: Date | string): string {
  return fechaFormatter.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}

const numeroFormatter = new Intl.NumberFormat(LOCALE);
const fechaSolaFormatter = new Intl.DateTimeFormat(LOCALE);

/** 12000 → «12.000». Reutiliza un único Intl.NumberFormat en vez de crear uno por llamada. */
export function formatearNumero(n: number): string {
  return numeroFormatter.format(n);
}

/** Solo la fecha (sin hora), p. ej. en tablas e impresión. */
export function formatearFechaCorta(fecha: Date | string): string {
  return fechaSolaFormatter.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
