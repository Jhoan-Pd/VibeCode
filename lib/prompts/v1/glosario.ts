import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";
import { GUIA_NIVEL } from "./niveles";

export function promptGlosario(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario; totalLineas: number }): string {
  const cantidad = params.nivel === "PRINCIPIANTE" ? "entre 5 y 12" : params.nivel === "AVANZADO" ? "entre 3 y 8" : "entre 4 y 10";
  return `TAREA: Crea un glosario de los conceptos de programación que se usan en este código.

${GUIA_NIVEL[params.nivel]}

QUÉ INCLUIR
- Conceptos del lenguaje y de programación que aparecen REALMENTE en el código: closures, async/await, promesas, decoradores, generadores, desestructuración, herencia, interfaces, recursión, consultas JOIN, selectores CSS, etc.
- También APIs o patrones relevantes (memoización, inyección de dependencias, middleware...).
- No incluyas conceptos que no aparecen en el código, ni nombres de variables propias.
- ${cantidad} conceptos, ordenados por importancia para entender el código.

CAMPOS
- "nombre": nombre corto del concepto (máximo 5 palabras).
- "explicacion": qué es y para qué sirve AQUÍ, en 1 a 3 oraciones adaptadas al nivel.
- "lineaInicio" y "lineaFin": el primer lugar del código donde se usa (números de la izquierda, entre 1 y ${params.totalLineas}). Usa null si no aplica a líneas concretas.

FORMATO DE SALIDA (JSON estricto):
{
  "conceptos": [
    { "nombre": "async/await", "explicacion": "...", "lineaInicio": 2, "lineaFin": 5 }
  ]
}

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}
