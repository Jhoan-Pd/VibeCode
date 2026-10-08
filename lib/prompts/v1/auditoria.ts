import type { NivelUsuario } from "@/schemas/common";
import { envolverCodigo } from "./codigo";
import { GUIA_NIVEL } from "./niveles";

export function promptAuditoria(params: { codigoNumerado: string; lenguaje: string; nivel: NivelUsuario; totalLineas: number }): string {
  return `TAREA: Audita este código generado por IA ("vibe code") y reporta problemas reales.

${GUIA_NIVEL[params.nivel]}

CATEGORÍAS ("tipo")
- SEGURIDAD: inyección SQL/comandos, XSS, secretos en el código, validación de entrada ausente, criptografía débil, CORS abierto, deserialización insegura, etc.
- MALA_PRACTICA: variables globales mutables, duplicación, nombres engañosos, complejidad innecesaria, condiciones de carrera, fugas de memoria.
- CODIGO_MUERTO: funciones, variables, importaciones o ramas que nunca se usan o nunca se ejecutan.
- MANEJO_ERRORES: promesas sin catch, excepciones tragadas, falta de validación de respuestas, recursos sin cerrar.
- ALUCINACION: librerías, módulos, métodos o parámetros que probablemente NO existen, están deprecados o se usan con una firma incorrecta (errores típicos de la IA).

SEVERIDAD ("severidad")
- CRITICA: explotable o rompe el programa en uso normal. ALTA: problema serio probable. MEDIA: riesgo moderado o deuda técnica clara. BAJA: mejora menor.

REGLAS
- Reporta solo problemas que se puedan señalar en ESTE código; no inventes hallazgos para llenar la lista. Si el código está bien, devuelve una lista vacía.
- En ALUCINACION sé honesto con la incertidumbre: si no estás seguro de que una API no existe, dilo en la descripción ("posiblemente", "verifica en la documentación").
- "descripcion": qué está mal y por qué importa (máximo ~80 palabras). "sugerencia": cómo corregirlo, concreto; puedes incluir un fragmento corto entre comillas invertidas.
- "lineaInicio"/"lineaFin": líneas afectadas (números de la izquierda, entre 1 y ${params.totalLineas}); null si el problema es de todo el archivo.
- Máximo 12 hallazgos, ordenados de mayor a menor severidad.

FORMATO DE SALIDA (JSON estricto):
{
  "hallazgos": [
    { "tipo": "MANEJO_ERRORES", "severidad": "MEDIA", "titulo": "Promesa sin manejo de error", "descripcion": "...", "sugerencia": "...", "lineaInicio": 4, "lineaFin": 6 }
  ]
}

${envolverCodigo(params.codigoNumerado, params.lenguaje)}`;
}
