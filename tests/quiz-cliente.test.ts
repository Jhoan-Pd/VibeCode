import { describe, expect, it } from "vitest";
import { contarSinResponder, describirRespuesta, estadoOpcion, moverPaso, respuestasIniciales, textoFaltan } from "@/lib/quiz-cliente";
import type { PreguntaPublica, ResultadoPregunta } from "@/schemas/quiz";

const pregunta = (id: string, tipo: PreguntaPublica["tipo"], opciones: string[] | null = null) =>
  ({ id, orden: 0, tipo, enunciado: "?", opciones, lineaInicio: null, lineaFin: null, concepto: null }) as PreguntaPublica;

describe("lógica de la interfaz del quiz", () => {
  const preguntas = [pregunta("a", "VERDADERO_FALSO"), pregunta("b", "ORDENAR", ["x", "y", "z"]), pregunta("c", "OPCION_MULTIPLE", ["1", "2"])];

  it("ORDENAR empieza respondida con el orden mostrado; el resto sin responder", () => {
    const r = respuestasIniciales(preguntas);
    expect(r).toEqual({ a: null, b: [0, 1, 2], c: null });
    expect(contarSinResponder(preguntas, r)).toBe(2);
    expect(contarSinResponder(preguntas, { ...r, a: false, c: 0 })).toBe(0);
  });

  it("textoFaltan concuerda en número", () => {
    expect(textoFaltan(1)).toBe("Te falta 1 pregunta.");
    expect(textoFaltan(3)).toBe("Te faltan 3 preguntas.");
  });

  it("moverPaso intercambia con el vecino y no se sale de los bordes", () => {
    expect(moverPaso([0, 1, 2], 0, 1)).toEqual([1, 0, 2]);
    expect(moverPaso([0, 1, 2], 2, -1)).toEqual([0, 2, 1]);
    const orden = [0, 1];
    expect(moverPaso(orden, 0, -1)).toBe(orden);
  });

  it("describe cada tipo de respuesta", () => {
    expect(describirRespuesta({ opciones: null }, true)).toBe("Verdadero");
    expect(describirRespuesta({ opciones: ["uno", "dos"] }, 1)).toBe("B. dos");
    expect(describirRespuesta({ opciones: ["x", "y"] }, [1, 0])).toBe("1) y  2) x");
  });

  it("estadoOpcion marca la correcta y la elegida incorrecta", () => {
    const r = { respuestaCorrecta: 1 } as ResultadoPregunta;
    expect(estadoOpcion(undefined, 1, true)).toBe("neutral");
    expect(estadoOpcion(r, 1, false)).toBe("correcta");
    expect(estadoOpcion(r, 0, true)).toBe("incorrecta");
    expect(estadoOpcion(r, 0, false)).toBe("neutral");
  });
});
