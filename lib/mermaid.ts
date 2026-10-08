/**
 * Utilidades Mermaid isomórficas (sin DOM). La validación REAL del diagrama la hace el cliente con
 * mermaid.parse(); aquí solo se normaliza lo que devuelve el LLM y se detectan errores obvios
 * para poder reintentar con el LLM antes de guardar nada.
 */

export type TipoMermaid = "FLUJO" | "CLASES" | "SECUENCIA";

const ENCABEZADOS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/;

/** Encabezado esperado según el tipo de diagrama. */
export const ENCABEZADO_POR_TIPO: Record<TipoMermaid, string> = {
  FLUJO: "flowchart TD",
  CLASES: "classDiagram",
  SECUENCIA: "sequenceDiagram",
};

const PATRON_ENCABEZADO: Record<TipoMermaid, RegExp> = {
  FLUJO: /^(flowchart|graph)\b/,
  CLASES: /^classDiagram\b/,
  SECUENCIA: /^sequenceDiagram\b/,
};

/** Flechas o relaciones mínimas que debe contener cada tipo de diagrama. */
const PATRON_RELACION: Record<TipoMermaid, RegExp> = {
  FLUJO: /-->|---|==>|-\.->/,
  // Un diagrama de clases puede tener una sola clase: basta una definición o una relación.
  CLASES: /\bclass\s+[A-Za-z_]|<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\./,
  SECUENCIA: /->>|-->>|->|-->|-x|--x|-\)|--\)/,
};

export function normalizarMermaid(texto: string, tipo: TipoMermaid = "FLUJO"): string {
  let t = texto.trim();

  // Quita fences ```mermaid ... ```
  const fence = t.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // Algunos modelos escapan dos veces: "\\n" literal en lugar de salto de línea.
  if (!t.includes("\n") && t.includes("\\n")) t = t.replace(/\\n/g, "\n");
  t = t.replace(/\\"/g, '"');

  const lineas = t
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    // Elimina directivas de inicialización e interacciones (click, link, callback) por seguridad.
    .filter((l) => !/^\s*%%\{/.test(l) && !/^\s*(click|link|links|callback)\s/i.test(l));

  const primera = lineas.findIndex((l) => l.trim() !== "" && !/^\s*%%/.test(l));
  if (primera === -1) return "";
  if (!ENCABEZADOS.test(lineas[primera].trim())) {
    lineas.splice(primera, 0, ENCABEZADO_POR_TIPO[tipo]);
  }
  return lineas.join("\n").trim();
}

/** Comprobaciones baratas de forma. Devuelve una lista de problemas (vacía = parece correcto). */
export function validarMermaidBasico(mermaid: string, tipo: TipoMermaid = "FLUJO"): string[] {
  const problemas: string[] = [];
  const lineas = mermaid.split("\n").filter((l) => l.trim() !== "");
  if (!PATRON_ENCABEZADO[tipo].test(lineas[0]?.trim() ?? "")) {
    problemas.push(`La primera línea debe ser '${ENCABEZADO_POR_TIPO[tipo]}'.`);
  }
  if (!PATRON_RELACION[tipo].test(lineas.slice(1).join("\n"))) {
    problemas.push(
      tipo === "SECUENCIA"
        ? "El diagrama de secuencia no contiene ningún mensaje entre participantes (por ejemplo A->>B: texto)."
        : tipo === "CLASES"
          ? "El diagrama de clases no define ninguna clase ni relación."
          : "El diagrama no contiene ninguna flecha entre nodos.",
    );
  }
  const comillas = (mermaid.match(/"/g) ?? []).length;
  if (comillas % 2 !== 0) problemas.push("Hay un número impar de comillas dobles: algún texto no está cerrado.");
  if (lineas.length > 80) problemas.push("El diagrama es demasiado grande (más de 80 líneas); resume los pasos.");
  if (tipo === "SECUENCIA" && lineas.some((l) => /;\s*$/.test(l))) {
    problemas.push("No termines las líneas del diagrama de secuencia con punto y coma.");
  }
  return problemas;
}
