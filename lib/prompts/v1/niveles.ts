import type { NivelUsuario } from "@/schemas/common";

/** Cómo debe adaptarse el tono y la profundidad de la explicación al nivel del usuario. */
export const GUIA_NIVEL: Record<NivelUsuario, string> = {
  PRINCIPIANTE: `NIVEL DEL USUARIO: PRINCIPIANTE.
- Explica como a alguien que está aprendiendo: define cada término técnico la primera vez que aparece.
- Usa analogías cotidianas cuando ayuden (p. ej., una variable como una caja con etiqueta).
- Explica el "qué hace" y el "por qué" de CADA paso, incluso los que parecen obvios.
- Frases cortas, tono cercano y alentador. Evita jerga sin explicarla.`,
  INTERMEDIO: `NIVEL DEL USUARIO: INTERMEDIO.
- Asume que conoce sintaxis básica, variables, funciones y estructuras de control.
- Explica con precisión lo no obvio: patrones usados, APIs de librerías, efectos secundarios.
- Menciona el nombre del patrón o concepto (closure, memoización, inyección de dependencias...) cuando aplique.
- Sé conciso: no expliques lo trivial.`,
  AVANZADO: `NIVEL DEL USUARIO: AVANZADO.
- Asume dominio del lenguaje y de los patrones comunes; no definas términos estándar.
- Céntrate en decisiones de diseño, complejidad temporal/espacial, casos límite, concurrencia, manejo de errores y trade-offs.
- Señala qué podría fallar en producción y por qué el autor pudo elegir este enfoque.
- Máxima densidad de información; evita rodeos.`,
};
