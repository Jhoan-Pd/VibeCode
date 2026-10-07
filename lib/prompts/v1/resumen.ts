import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";
import { GUIA_NIVEL } from "./niveles";

export function promptResumen(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario }): string {
  return `TAREA: Resume qué hace este código.

${GUIA_NIVEL[params.nivel]}

FORMATO DE SALIDA (JSON estricto):
{
  "proposito": "2 a 4 oraciones: qué problema resuelve el código y cómo lo hace a grandes rasgos",
  "entradas": ["cada parámetro, argumento, dato de entrada o fuente externa, con su tipo/significado. Lista vacía si no hay"],
  "salidas": ["cada valor retornado, efecto secundario, salida por consola, archivo o petición que produce. Lista vacía si no hay"],
  "dependencias": ["cada librería, módulo, API o servicio externo que usa, indicando si es nativo/estándar o de terceros. Lista vacía si no hay"]
}

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}
