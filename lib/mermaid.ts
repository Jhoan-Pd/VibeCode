/**
 * Utilidades Mermaid isomórficas (sin DOM). La validación REAL del diagrama la hace el cliente con
 * mermaid.parse(); aquí solo se normaliza lo que devuelve el LLM y se detectan errores obvios
 * para poder reintentar con el LLM antes de guardar nada.
 */

const ENCABEZADOS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/;

export function normalizarMermaid(texto: string): string {
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
    // Elimina directivas de inicialización y interacciones (click) por seguridad.
    .filter((l) => !/^\s*%%\{/.test(l) && !/^\s*click\s/i.test(l));

  const primera = lineas.findIndex((l) => l.trim() !== "" && !/^\s*%%/.test(l));
  if (primera === -1) return "";
  if (!ENCABEZADOS.test(lineas[primera].trim())) {
    lineas.splice(primera, 0, "flowchart TD");
  }
  return lineas.join("\n").trim();
}

/** Comprobaciones baratas de forma. Devuelve una lista de problemas (vacía = parece correcto). */
export function validarMermaidBasico(mermaid: string): string[] {
  const problemas: string[] = [];
  const lineas = mermaid.split("\n").filter((l) => l.trim() !== "");
  if (!ENCABEZADOS.test(lineas[0]?.trim() ?? "")) problemas.push("La primera línea debe ser 'flowchart TD'.");
  if (!/-->|---|==>|-\.->/.test(mermaid)) problemas.push("El diagrama no contiene ninguna flecha entre nodos.");
  const comillas = (mermaid.match(/"/g) ?? []).length;
  if (comillas % 2 !== 0) problemas.push("Hay un número impar de comillas dobles: algún texto de nodo no está cerrado.");
  if (lineas.length > 80) problemas.push("El diagrama es demasiado grande (más de 80 líneas); resume los pasos.");
  return problemas;
}
