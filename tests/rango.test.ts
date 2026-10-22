import { describe, expect, it } from "vitest";
import { rangoDesdeParametro, recortarRango } from "@/lib/rango";

describe("rangoDesdeParametro (?l=)", () => {
  it("acepta una línea o un rango", () => {
    expect(rangoDesdeParametro("4", 10)).toEqual({ inicio: 4, fin: 4 });
    expect(rangoDesdeParametro("3-9", 10)).toEqual({ inicio: 3, fin: 9 });
  });

  it("recorta el final al tamaño del archivo", () => {
    expect(rangoDesdeParametro("8-50", 10)).toEqual({ inicio: 8, fin: 10 });
  });

  it("ignora valores inválidos", () => {
    for (const v of [undefined, null, "", "0", "9-3", "11", "a-b", "1-2-3", "-5", "1;alert(1)", "9999999"]) {
      expect(rangoDesdeParametro(v, 10)).toBeNull();
    }
  });
});

describe("recortarRango (rangos del LLM)", () => {
  it("completa el extremo que falta, invierte y recorta", () => {
    expect(recortarRango(5, null, 10)).toEqual({ inicio: 5, fin: 5 });
    expect(recortarRango(null, 7, 10)).toEqual({ inicio: 7, fin: 7 });
    expect(recortarRango(9, 3, 10)).toEqual({ inicio: 3, fin: 9 });
    expect(recortarRango(0, 40, 10)).toEqual({ inicio: 1, fin: 10 });
  });

  it("devuelve null si no hay rango o queda fuera del archivo", () => {
    expect(recortarRango(null, undefined, 10)).toBeNull();
    expect(recortarRango(11, 20, 10)).toBeNull();
    expect(recortarRango(-4, 0, 10)).toBeNull();
  });
});
