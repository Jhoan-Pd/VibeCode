import { detectLanguage } from "@/lib/language";

/** Comentarios de una línea en los lenguajes soportados: no sirven como título. */
const COMENTARIO = /^(\/\/|#|\/\*|\*|--|<!--)/;
const LARGO_TITULO = 60;

/** Título por defecto: la primera línea con código (sin comentarios), recortada, más el lenguaje. */
export function tituloAutomatico(codigo: string, lenguaje: string): string {
  const primera = codigo
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !COMENTARIO.test(l));
  const base = (primera ?? "Código sin título").replace(/\s+/g, " ").slice(0, LARGO_TITULO);
  return `${base} (${lenguaje})`;
}

/** Lenguaje (si es "auto") y título resueltos para un análisis nuevo; también lo usa la caché. */
export function resolverMetadatos(input: { codigo: string; lenguaje: string; titulo?: string | null }): { lenguaje: string; titulo: string } {
  const lenguaje = input.lenguaje === "auto" ? detectLanguage(input.codigo) : input.lenguaje;
  return { lenguaje, titulo: input.titulo?.trim() || tituloAutomatico(input.codigo, lenguaje) };
}
