import type { TipoMermaid } from "@/lib/mermaid";
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

export const REGLAS_MERMAID_CLASES = `REGLAS DE SINTAXIS PARA classDiagram (obligatorias)
- La primera línea es exactamente: classDiagram
- Nombres de clase alfanuméricos sin espacios. Genéricos con virgulillas: Lista~T~ (nunca < >).
- Miembros dentro de llaves, uno por línea: +nombre tipo y métodos +metodo(param) tipoRetorno. Visibilidad: + pública, - privada, # protegida.
- Relaciones: herencia Hija --|> Padre, composición A *-- B, agregación A o-- B, asociación A --> B, dependencia A ..> B, implementación A ..|> Interfaz. Etiqueta opcional: A --> B : usa
- Interfaces o clases abstractas con anotación en línea propia: <<interface>> Nombre
- No uses comillas dobles, note, click, style, classDef ni directivas %%{init}.
- Máximo 12 clases.`;

export const REGLAS_MERMAID_SECUENCIA = `REGLAS DE SINTAXIS PARA sequenceDiagram (obligatorias)
- La primera línea es exactamente: sequenceDiagram
- Declara los participantes al inicio: participant C as Cliente (el alias, C, es alfanumérico sin espacios).
- Mensajes: C->>S: texto (llamada), S-->>C: texto (respuesta). Bloques opcionales: alt condición / else / end, loop texto / end, opt texto / end.
- En los textos no uses punto y coma, comillas dobles, almohadilla (#) ni los caracteres < > { }.
- No uses click, link, style ni directivas %%{init}.
- Máximo 20 mensajes.`;

export function promptDiagramasEstructurales(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario }): string {
  return `TAREA: Decide si este código necesita un diagrama de clases y/o un diagrama de secuencia, y genéralos en Mermaid.

CUÁNDO GENERAR CADA UNO
- "clases": SOLO si el código define clases, interfaces, structs, modelos o tipos con relaciones (orientación a objetos). Si no, null.
- "secuencia": SOLO si hay interacción entre varias funciones, objetos, módulos o servicios (llamadas HTTP, BD, eventos, callbacks entre componentes). Si es una sola función lineal, null.
- Es válido devolver ambos en null.
${params.nivel === "PRINCIPIANTE" ? "- Prefiere diagramas pequeños y con nombres claros." : ""}

${REGLAS_MERMAID_CLASES}

${REGLAS_MERMAID_SECUENCIA}

FORMATO DE SALIDA (JSON estricto):
{
  "clases": { "titulo": "Clases principales", "mermaid": "classDiagram\\n  class Cuenta {\\n    +saldo number\\n  }" } o null,
  "secuencia": { "titulo": "Petición de un usuario", "mermaid": "sequenceDiagram\\n  participant C as Cliente\\n  C->>S: pide datos" } o null
}
El valor de cada "mermaid" es una sola cadena JSON con los saltos de línea escapados como \\n.

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}

const REGLAS_POR_TIPO: Record<TipoMermaid, string> = {
  FLUJO: REGLAS_MERMAID,
  CLASES: REGLAS_MERMAID_CLASES,
  SECUENCIA: REGLAS_MERMAID_SECUENCIA,
};

const EJEMPLO_POR_TIPO: Record<TipoMermaid, string> = {
  FLUJO: "flowchart TD\\n  ...",
  CLASES: "classDiagram\\n  ...",
  SECUENCIA: "sequenceDiagram\\n  ...",
};

export function promptRepararDiagrama(params: { mermaid: string; error: string; tipo?: TipoMermaid }): string {
  const tipo = params.tipo ?? "FLUJO";
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

${REGLAS_POR_TIPO[tipo]}

FORMATO DE SALIDA (JSON estricto):
{ "titulo": "título corto del diagrama", "mermaid": "${EJEMPLO_POR_TIPO[tipo]}" }`;
}
