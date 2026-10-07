import { describe, expect, it } from "vitest";
import { dividirEnBloques, numerarLineas } from "@/lib/chunking";
import { hashCodigo, normalizarCodigo } from "@/lib/hash";

const generar = (n: number, blancoCada = 0) =>
  Array.from({ length: n }, (_, i) => (blancoCada && (i + 1) % blancoCada === 0 ? "" : `linea ${i + 1}`)).join("\n");

describe("dividirEnBloques", () => {
  it("no divide el código corto", () => {
    const b = dividirEnBloques(generar(10), 50);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ inicio: 1, fin: 10 });
  });

  it("cubre todas las líneas sin huecos ni solapes y respeta el tamaño máximo", () => {
    const total = 437;
    const bloques = dividirEnBloques(generar(total), 100);
    expect(bloques[0].inicio).toBe(1);
    expect(bloques.at(-1)!.fin).toBe(total);
    for (let i = 1; i < bloques.length; i++) expect(bloques[i].inicio).toBe(bloques[i - 1].fin + 1);
    for (const b of bloques) {
      expect(b.lineas.length).toBeLessThanOrEqual(100);
      expect(b.fin - b.inicio + 1).toBe(b.lineas.length);
    }
  });

  it("prefiere cortar justo después de una línea en blanco", () => {
    const bloques = dividirEnBloques(generar(200, 45), 100); // en blanco: 45, 90, 135, 180
    expect(bloques[0].fin).toBe(90);
    expect(bloques[0].lineas.at(-1)).toBe("");
  });

  it("numera con el número de línea real", () => {
    const texto = numerarLineas(["a", "b"], 99);
    expect(texto).toBe(" 99 | a\n100 | b");
  });
});

describe("hashCodigo (clave de caché)", () => {
  it("es estable ante saltos de línea de Windows y espacios finales", () => {
    expect(hashCodigo("let a = 1;\r\nlet b = 2;  \r\n", "INTERMEDIO")).toBe(hashCodigo("let a = 1;\nlet b = 2;", "INTERMEDIO"));
    expect(normalizarCodigo("x \r\ny\r\n")).toBe("x\ny");
  });

  it("cambia si cambia el código o el nivel", () => {
    const base = hashCodigo("let a = 1;", "INTERMEDIO");
    expect(hashCodigo("let a = 2;", "INTERMEDIO")).not.toBe(base);
    expect(hashCodigo("let a = 1;", "AVANZADO")).not.toBe(base);
    expect(base).toMatch(/^[a-f0-9]{64}$/);
  });
});
