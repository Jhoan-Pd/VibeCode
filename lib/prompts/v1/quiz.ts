import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";

const DIFICULTAD: Record<NivelUsuario, string> = {
  PRINCIPIANTE: "Preguntas directas sobre qué hace cada parte, el valor de variables y el orden de ejecución. Evita trampas.",
  INTERMEDIO: "Mezcla comprensión del flujo, efectos de cambiar una línea y uso correcto de las APIs.",
  AVANZADO: "Casos límite, concurrencia, complejidad, manejo de errores y consecuencias de cambios sutiles.",
};

export function promptQuiz(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario; totalLineas: number }): string {
  return `TAREA: Crea un quiz de comprensión de 5 a 10 preguntas sobre ESTE código concreto (no preguntas genéricas del lenguaje).

DIFICULTAD: ${DIFICULTAD[params.nivel]}

TIPOS DE PREGUNTA ("tipo") — usa al menos 3 tipos distintos
- OPCION_MULTIPLE: "opciones" (3 a 5 textos) y "correcta" (índice desde 0 de la opción correcta).
- QUE_IMPRIME: qué imprime, retorna o vale algo para una entrada concreta. "opciones" y "correcta" como arriba.
- QUE_PASA_SI: qué ocurre si se cambia o elimina una línea concreta. "opciones" y "correcta" como arriba.
- VERDADERO_FALSO: una afirmación sobre el código. "correcta": true o false (booleano JSON).
- ORDENAR: "pasos" (3 a 6 textos) EN EL ORDEN CORRECTO de ejecución; el sistema los desordena después.

REGLAS
- Cada pregunta debe poder responderse leyendo el código. Una sola respuesta correcta; los distractores deben ser plausibles.
- Varía la posición de la opción correcta.
- "explicacion": por qué la respuesta correcta lo es (1 a 3 oraciones), citando las líneas.
- "lineaInicio"/"lineaFin": líneas del código que hay que entender para responder (entre 1 y ${params.totalLineas}).
- "concepto": concepto de programación que evalúa la pregunta (por ejemplo "closures", "manejo de errores", "bucles"). Úsalo de forma consistente: mismo nombre para el mismo concepto.
- No reveles la respuesta en el enunciado.

FORMATO DE SALIDA (JSON estricto):
{
  "preguntas": [
    { "tipo": "OPCION_MULTIPLE", "enunciado": "...", "opciones": ["...", "...", "..."], "correcta": 1, "explicacion": "...", "lineaInicio": 3, "lineaFin": 5, "concepto": "..." },
    { "tipo": "VERDADERO_FALSO", "enunciado": "...", "correcta": false, "explicacion": "...", "lineaInicio": 7, "lineaFin": 7, "concepto": "..." },
    { "tipo": "ORDENAR", "enunciado": "Ordena lo que ocurre cuando...", "pasos": ["primero", "segundo", "tercero"], "explicacion": "...", "lineaInicio": 2, "lineaFin": 9, "concepto": "..." }
  ]
}

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}
