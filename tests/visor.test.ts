import { describe, expect, it } from "vitest";
import { bloqueDeLinea, contarLineas, indicePorLinea, rangoDeSeleccion } from "@/lib/visor";

describe("visor", () => {
  it("indicePorLinea asigna cada línea a su bloque y -1 a las demás", () => {
    const idx = indicePorLinea([{ lineaInicio: 1, lineaFin: 2 }, { lineaInicio: 4, lineaFin: 6 }], 7);
    expect([1, 2, 3, 4, 6, 7].map((l) => bloqueDeLinea(idx, l))).toEqual([0, 0, null, 1, 1, null]);
    expect(bloqueDeLinea(idx, 0)).toBeNull();
    expect(bloqueDeLinea(idx, 99)).toBeNull();
  });

  it("ante solapes gana el último bloque y recorta fuera del archivo", () => {
    const idx = indicePorLinea([{ lineaInicio: 1, lineaFin: 5 }, { lineaInicio: 3, lineaFin: 40 }], 4);
    expect([1, 2, 3, 4].map((l) => bloqueDeLinea(idx, l))).toEqual([0, 0, 1, 1]);
  });

  it("rangoDeSeleccion descarta la última línea si la selección acaba en su columna 1", () => {
    expect(rangoDeSeleccion({ startLineNumber: 3, endLineNumber: 6, endColumn: 1 })).toEqual({ inicio: 3, fin: 5 });
    expect(rangoDeSeleccion({ startLineNumber: 3, endLineNumber: 6, endColumn: 4 })).toEqual({ inicio: 3, fin: 6 });
    expect(rangoDeSeleccion({ startLineNumber: 3, endLineNumber: 3, endColumn: 1 })).toEqual({ inicio: 3, fin: 3 });
  });

  it("contarLineas coincide con split", () => {
    for (const t of ["", "a", "a\nb", "a\n", "\n\n\n"]) expect(contarLineas(t)).toBe(t.split("\n").length);
  });
});
