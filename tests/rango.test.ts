import { describe, expect, it } from "vitest";
import { rangoDesdeParametro } from "@/lib/rango";

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
