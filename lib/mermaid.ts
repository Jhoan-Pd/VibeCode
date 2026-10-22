/**
 * Utilidades Mermaid isomórficas (sin DOM). La validación REAL del diagrama la hace el cliente con
 * mermaid.parse(); aquí solo se normaliza lo que devuelve el LLM y se detectan errores obvios
 * para poder reintentar con el LLM antes de guardar nada.
 */

/** Tipos de diagrama soportados (fuente única: de aquí salen el tipo, los esquemas Zod y las pestañas). */
export const TIPOS_MERMAID = ["FLUJO", "CLASES", "SECUENCIA"] as const;
export type TipoMermaid = (typeof TIPOS_MERMAID)[number];

const ENCABEZADOS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/;

/** Lo que define a cada tipo de diagrama, en una sola tabla (agregar un tipo es agregar una fila). */
interface ReglaDiagrama {
  /** Encabezado que se antepone si el LLM lo omite. */
  encabezado: string;
  patronEncabezado: RegExp;
  /** Flechas o relaciones mínimas que debe contener. */
  patronRelacion: RegExp;
  /** Problema que se le devuelve al LLM si no hay ninguna relación. */
  sinRelacion: string;
}

const REGLAS: Record<TipoMermaid, ReglaDiagrama> = {
  FLUJO: {
    encabezado: "flowchart TD",
    patronEncabezado: /^(flowchart|graph)\b/,
    patronRelacion: /-->|---|==>|-\.->/,
    sinRelacion: "El diagrama no contiene ninguna flecha entre nodos.",
  },
  CLASES: {
    encabezado: "classDiagram",
    patronEncabezado: /^classDiagram\b/,
    // Un diagrama de clases puede tener una sola clase: basta una definición o una relación.
    patronRelacion: /\bclass\s+[A-Za-z_]|<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\./,
    sinRelacion: "El diagrama de clases no define ninguna clase ni relación.",
  },
  SECUENCIA: {
    encabezado: "sequenceDiagram",
    patronEncabezado: /^sequenceDiagram\b/,
    patronRelacion: /->>|-->>|->|-->|-x|--x|-\)|--\)/,
    sinRelacion: "El diagrama de secuencia no contiene ningún mensaje entre participantes (por ejemplo A->>B: texto).",
  },
};

/** Máximo de líneas no vacías: un diagrama más grande no se lee en pantalla. */
const MAX_LINEAS_DIAGRAMA = 80;

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
    lineas.splice(primera, 0, REGLAS[tipo].encabezado);
  }
  return lineas.join("\n").trim();
}

/** Comprobaciones baratas de forma. Devuelve una lista de problemas (vacía = parece correcto). */
export function validarMermaidBasico(mermaid: string, tipo: TipoMermaid = "FLUJO"): string[] {
  const problemas: string[] = [];
  const regla = REGLAS[tipo];
  const lineas = mermaid.split("\n").filter((l) => l.trim() !== "");
  if (!regla.patronEncabezado.test(lineas[0]?.trim() ?? "")) problemas.push(`La primera línea debe ser '${regla.encabezado}'.`);
  if (!regla.patronRelacion.test(lineas.slice(1).join("\n"))) problemas.push(regla.sinRelacion);
  const comillas = (mermaid.match(/"/g) ?? []).length;
  if (comillas % 2 !== 0) problemas.push("Hay un número impar de comillas dobles: algún texto no está cerrado.");
  if (lineas.length > MAX_LINEAS_DIAGRAMA) problemas.push(`El diagrama es demasiado grande (más de ${MAX_LINEAS_DIAGRAMA} líneas); resume los pasos.`);
  if (tipo === "SECUENCIA" && lineas.some((l) => /;\s*$/.test(l))) {
    problemas.push("No termines las líneas del diagrama de secuencia con punto y coma.");
  }
  return problemas;
}
