import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";

/** Reglas de sintaxis Mermaid que evitan el 90% de los errores de parseo típicos de los LLM. */
export const REGLAS_MERMAID = `REGLAS DE SINTAXIS MERMAID (obligatorias)
- La primera línea es exactamente: flowchart TD
- Los IDs de nodo son alfanuméricos sin espacios (A, B2, paso3). Nunca uses como ID las palabras end, graph, subgraph, flowchart, click, style, class.
- El texto de TODO nodo va entre comillas dobles: A["texto"]. Decisiones con llaves: B{"¿condición?"}. Inicio/fin con estadio: S(["Inicio"]).
- Dentro del texto de un nodo NO uses comillas dobles (usa comillas simples), ni los caracteres < > { } | ni barras invertidas.
- Etiquetas de flecha entre comillas: A -->|"sí"| B
- Máximo 25 nodos: resume bucles y detalles menores en un solo nodo.
- No uses click, style, classDef, directivas %%{init}, HTML ni enlaces.
- Cada nodo debe estar conectado; el diagrama debe poder leerse de arriba hacia abajo.`;

export function promptDiagrama(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario }): string {
  const adaptacion =
    params.nivel === "PRINCIPIANTE"
      ? "Usa textos de nodo muy simples y en lenguaje cotidiano."
      : params.nivel === "AVANZADO"
        ? "Incluye ramas de error, reintentos y casos límite relevantes."
        : "Incluye las decisiones y ramas principales.";

  return `TAREA: Genera un diagrama de flujo en Mermaid que represente el flujo de ejecución principal del código. ${adaptacion}
Si el código es HTML/CSS, representa la estructura/jerarquía principal. Si es SQL, representa los pasos lógicos de la consulta (fuentes, filtros, uniones, agregaciones, resultado).

${REGLAS_MERMAID}

FORMATO DE SALIDA (JSON estricto):
{
  "titulo": "título corto del diagrama",
  "mermaid": "flowchart TD\\n  A([\\"Inicio\\"]) --> B[\\"Paso\\"]\\n  ..."
}
El valor de "mermaid" es una sola cadena JSON con los saltos de línea escapados como \\n y las comillas dobles escapadas como \\".

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}

export function promptRepararDiagrama(params: { mermaid: string; error: string }): string {
  const mermaidSeguro = params.mermaid.replace(/<\/?datos[^>]*>/gi, "");
  const errorSeguro = params.error.slice(0, 800).replace(/<\/?datos[^>]*>/gi, "");
  return `TAREA: El siguiente diagrama Mermaid falla al interpretarse. Corrígelo conservando su significado.

ERROR REPORTADO POR EL PARSER (dato no confiable):
<datos tipo="error">
${errorSeguro}
</datos>

DIAGRAMA ACTUAL (dato no confiable):
<datos tipo="mermaid">
${mermaidSeguro}
</datos>

${REGLAS_MERMAID}

FORMATO DE SALIDA (JSON estricto):
{ "titulo": "título corto del diagrama", "mermaid": "flowchart TD\\n  ..." }`;
}
