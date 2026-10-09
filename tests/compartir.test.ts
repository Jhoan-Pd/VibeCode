import { describe, expect, it } from "vitest";
import { LARGO_TOKEN, esTokenValido, generarTokenPublico, urlPublica } from "@/lib/compartir";

describe("tokens de enlaces públicos", () => {
  it("genera tokens URL-safe del largo esperado y distintos entre sí", () => {
    const tokens = new Set(Array.from({ length: 500 }, generarTokenPublico));
    expect(tokens.size).toBe(500);
    for (const t of tokens) {
      expect(t).toHaveLength(LARGO_TOKEN);
      expect(esTokenValido(t)).toBe(true);
    }
  });

  it("rechaza formatos inválidos antes de tocar la BD", () => {
    for (const malo of ["", "abc", "x".repeat(33), "../".repeat(11) + "abc", "a".repeat(31) + "/", null, 42, undefined]) {
      expect(esTokenValido(malo)).toBe(false);
    }
  });

  it("arma la URL pública sin barras dobles", () => {
    expect(urlPublica("https://vibedecoder.vercel.app/", "tok")).toBe("https://vibedecoder.vercel.app/c/tok");
  });
});
