import { describe, expect, it } from "vitest";
import { RUTA, bezier, cuadro, mascaras, suavizado, tangente } from "@/lib/vuelo";

describe("vuelo del avión de papel", () => {
  it("la curva empieza y termina en sus extremos", () => {
    expect(bezier(RUTA, 0)).toEqual(RUTA[0]);
    expect(bezier(RUTA, 1)).toEqual(RUTA[3]);
  });

  it("entra por la izquierda, cruza la palabra y sale por la derecha", () => {
    expect(cuadro(0).x).toBeLessThan(0);
    expect(cuadro(1).x).toBeGreaterThan(1);
    const xs = Array.from({ length: 41 }, (_, i) => cuadro(i / 40).x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    // A mitad del vuelo está sobre la palabra, a la altura de las letras.
    const medio = cuadro(0.5);
    expect(medio.x).toBeGreaterThan(0);
    expect(medio.x).toBeLessThan(1);
    expect(medio.y).toBeGreaterThan(0.2);
    expect(medio.y).toBeLessThan(1.2);
  });

  it("apunta en la dirección de vuelo: baja al entrar y sube al salir", () => {
    expect(cuadro(0.05).angulo).toBeGreaterThan(0);
    expect(cuadro(0.95).angulo).toBeLessThan(0);
    const d = tangente(RUTA, 0.5);
    expect(d.x).toBeGreaterThan(0);
  });

  it("aparece y desaparece suavemente", () => {
    expect(cuadro(0).opacidad).toBe(0);
    expect(cuadro(0.5).opacidad).toBe(1);
    expect(cuadro(1).opacidad).toBe(0);
    expect(suavizado(0)).toBe(0);
    expect(suavizado(1)).toBe(1);
    expect(suavizado(0.5)).toBeCloseTo(0.5);
  });

  it("las máscaras borran la palabra vieja detrás del avión y muestran la nueva", () => {
    const m = mascaras(0.5);
    expect(m.sale).toBe("linear-gradient(90deg, transparent 44.0%, #000 60.0%)");
    expect(m.entra).toBe("linear-gradient(90deg, #000 30.0%, transparent 48.0%)");
  });
});
