import { describe, expect, it } from "vitest";
import { barajarDistinto, calificar, esCorrecta, nivelComprension, prepararPreguntas, validarQuiz } from "@/lib/quiz";
import { QuizLLMSchema, aPreguntaPublica, type PreguntaGuardada, type QuizLLM } from "@/schemas/quiz";

const QUIZ_LLM: QuizLLM = {
  preguntas: [
    { tipo: "OPCION_MULTIPLE", enunciado: "¿Qué devuelve suma(2, 3)?", opciones: ["5", "23", "undefined"], correcta: 0, explicacion: "Suma los dos números en la línea 2.", lineaInicio: 1, lineaFin: 3, concepto: "funciones" },
    { tipo: "QUE_IMPRIME", enunciado: "¿Qué imprime la línea 5?", opciones: ["1", "2", "3"], correcta: 2, explicacion: "El bucle termina con i = 3.", lineaInicio: 4, lineaFin: 5, concepto: "bucles" },
    { tipo: "VERDADERO_FALSO", enunciado: "La función modifica sus argumentos.", correcta: false, explicacion: "Solo lee los parámetros.", lineaInicio: 1, lineaFin: 3, concepto: "funciones" },
    { tipo: "QUE_PASA_SI", enunciado: "¿Qué pasa si quitas el return?", opciones: ["Devuelve undefined", "Error de sintaxis", "Nada cambia"], correcta: 0, explicacion: "Sin return la función devuelve undefined.", lineaInicio: 2, lineaFin: 2, concepto: "funciones" },
    { tipo: "ORDENAR", enunciado: "Ordena lo que ocurre al llamar a main.", pasos: ["Lee la entrada", "Valida", "Calcula", "Imprime"], explicacion: "Es el orden de las líneas 6 a 9.", lineaInicio: 6, lineaFin: 9, concepto: "flujo de ejecución" },
  ],
};

function guardadas(): PreguntaGuardada[] {
  return prepararPreguntas(QUIZ_LLM.preguntas).map((p, i) => ({ ...p, id: `p${i}` }));
}

describe("esquema del quiz generado por el LLM", () => {
  it("acepta un quiz válido y convierte 'true'/'false' en booleanos", () => {
    const r = QuizLLMSchema.parse({
      preguntas: QUIZ_LLM.preguntas.map((p) => (p.tipo === "VERDADERO_FALSO" ? { ...p, correcta: "false" } : p)),
    });
    expect(r.preguntas[2]).toMatchObject({ tipo: "VERDADERO_FALSO", correcta: false });
  });

  it("rechaza menos de 5 preguntas y tipos desconocidos", () => {
    expect(QuizLLMSchema.safeParse({ preguntas: QUIZ_LLM.preguntas.slice(0, 4) }).success).toBe(false);
    expect(QuizLLMSchema.safeParse({ preguntas: [...QUIZ_LLM.preguntas.slice(0, 4), { tipo: "ENSAYO", enunciado: "Explica todo el código", explicacion: "..........." }] }).success).toBe(false);
  });

  it("la validación semántica detecta índices inválidos, opciones repetidas, rangos y poca variedad", () => {
    expect(validarQuiz(QUIZ_LLM, 9)).toEqual([]);
    const malo: QuizLLM = {
      preguntas: [
        { tipo: "OPCION_MULTIPLE", enunciado: "Pregunta uno?", opciones: ["a", "A", "b"], correcta: 7, explicacion: "Explicación larga.", lineaInicio: 1, lineaFin: 99 },
        ...Array.from({ length: 4 }, () => ({ tipo: "OPCION_MULTIPLE" as const, enunciado: "Pregunta igual?", opciones: ["x", "y", "z"], correcta: 0, explicacion: "Explicación larga." })),
      ],
    };
    const problemas = validarQuiz(malo, 10).join(" ");
    expect(problemas).toMatch(/índice válido/);
    expect(problemas).toMatch(/repetidas/);
    expect(problemas).toMatch(/fuera del archivo/);
    expect(problemas).toMatch(/3 tipos/);
  });
});

describe("preparación de preguntas", () => {
  it("baraja ORDENAR sin dejarla resuelta y guarda la permutación correcta", () => {
    const ordenar = prepararPreguntas(QUIZ_LLM.preguntas)[4];
    const correcta = ordenar.respuestaCorrecta as number[];
    expect(ordenar.opciones).not.toEqual(["Lee la entrada", "Valida", "Calcula", "Imprime"]);
    // Recorrer las opciones en el orden de la respuesta correcta reconstruye el orden real.
    expect(correcta.map((i) => ordenar.opciones![i])).toEqual(["Lee la entrada", "Valida", "Calcula", "Imprime"]);
  });

  it("barajarDistinto es determinista y nunca devuelve la identidad", () => {
    expect(barajarDistinto(4, "x")).toEqual(barajarDistinto(4, "x"));
    for (let s = 0; s < 200; s++) {
      const p = barajarDistinto(3, `semilla-${s}`);
      expect([...p].sort()).toEqual([0, 1, 2]);
      expect(p).not.toEqual([0, 1, 2]);
    }
    expect(barajarDistinto(1, "a")).toEqual([0]);
  });

  it("la versión pública no expone la respuesta ni la explicación", () => {
    const publica = aPreguntaPublica(guardadas()[0]);
    expect(publica).not.toHaveProperty("respuestaCorrecta");
    expect(publica).not.toHaveProperty("explicacion");
  });
});

describe("calificación del quiz", () => {
  const preguntas = guardadas();
  const ordenCorrecto = preguntas[4].respuestaCorrecta as number[];

  it("100 % con todas correctas, sin partes para repasar", () => {
    const r = calificar(preguntas, { p0: 0, p1: 2, p2: false, p3: 0, p4: ordenCorrecto });
    expect(r).toMatchObject({ aciertos: 5, total: 5, porcentaje: 100, nivelComprension: "Excelente", repasar: [] });
  });

  it("menos del 70 % recomienda repasar las líneas de las preguntas falladas, sin duplicados", () => {
    const r = calificar(preguntas, { p0: 1, p1: 2, p2: true, p3: 0, p4: [...ordenCorrecto].reverse() });
    expect(r.aciertos).toBe(2);
    expect(r.porcentaje).toBe(40);
    expect(r.nivelComprension).toBe("Insuficiente");
    // p0 y p2 comparten las líneas 1-3: aparecen una sola vez.
    expect(r.repasar).toEqual([
      { lineaInicio: 1, lineaFin: 3, concepto: "funciones" },
      { lineaInicio: 6, lineaFin: 9, concepto: "flujo de ejecución" },
    ]);
  });

  it("70 % o más aprueba y no sugiere repaso", () => {
    const r = calificar(preguntas, { p0: 0, p1: 2, p2: false, p3: 0, p4: [] });
    expect(r.porcentaje).toBe(80);
    expect(r.nivelComprension).toBe("Buena");
    expect(r.repasar).toEqual([]);
  });

  it("las respuestas faltantes o de tipo incorrecto cuentan como incorrectas", () => {
    expect(esCorrecta(preguntas[2], 0)).toBe(false); // V/F respondida con número
    expect(esCorrecta(preguntas[0], true)).toBe(false); // opción múltiple con booleano
    expect(esCorrecta(preguntas[4], [0, 1])).toBe(false); // permutación incompleta
    expect(calificar(preguntas, {}).aciertos).toBe(0);
  });

  it("niveles de comprensión por umbral", () => {
    expect([95, 70, 69.9, 50, 10].map(nivelComprension)).toEqual(["Excelente", "Buena", "Parcial", "Parcial", "Insuficiente"]);
  });
});
