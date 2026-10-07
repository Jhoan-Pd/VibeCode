import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";
import { GUIA_NIVEL } from "./niveles";

export function promptExplicacion(params: {
  codigoNumerado: string;
  lenguaje: string;
  nivel: NivelUsuario;
  inicio: number;
  fin: number;
  totalLineas: number;
}): string {
  const { inicio, fin, totalLineas } = params;
  const parcial = inicio !== 1 || fin !== totalLineas;

  return `TAREA: Explica el código por bloques lógicos de líneas consecutivas.
${parcial ? `Este es un FRAGMENTO: líneas ${inicio} a ${fin} de un archivo de ${totalLineas} líneas. Explica SOLO las líneas ${inicio}-${fin}; no tienes el resto del archivo.\n` : ""}
${GUIA_NIVEL[params.nivel]}

REGLAS DE LOS BLOQUES
- Usa EXACTAMENTE los números de línea que aparecen a la izquierda de cada línea (formato "N | código").
- Los bloques van en orden ascendente, sin solaparse y sin huecos de código con lógica. Puedes dejar fuera líneas en blanco y comentarios sueltos.
- Cada bloque agrupa una unidad lógica (importaciones, una función, un bucle, un manejo de error...). Tamaño típico: 2 a 8 líneas. Una sola línea solo si es compleja.
- Todos los bloques deben estar dentro del rango ${inicio}-${fin}.
- "titulo": máximo 8 palabras, describe la intención del bloque.
- "explicacion": explica qué hace Y por qué, adaptado al nivel. No repitas el código línea a línea sin aportar. Máximo ~120 palabras.

FORMATO DE SALIDA (JSON estricto):
{
  "bloques": [
    { "lineaInicio": ${inicio}, "lineaFin": 3, "titulo": "Importaciones", "explicacion": "..." }
  ]
}

${envolverCodigo(params.codigoNumerado, params.lenguaje, { inicio, fin, total: totalLineas })}`;
}
