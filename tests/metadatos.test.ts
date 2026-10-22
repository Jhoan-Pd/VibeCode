import { describe, expect, it } from "vitest";
import { resolverMetadatos, tituloAutomatico } from "@/lib/metadatos";

describe("metadatos del análisis", () => {
  it("el título salta comentarios y líneas vacías", () => {
    expect(tituloAutomatico("\n// util\n# otro\nfunction suma(a, b) {", "javascript")).toBe("function suma(a, b) { (javascript)");
  });

  it("recorta a 60 caracteres y compacta espacios", () => {
    const t = tituloAutomatico(`const   x = "${"a".repeat(100)}"`, "typescript");
    expect(t.startsWith('const x = "')).toBe(true);
    expect(t.length).toBe(60 + " (typescript)".length);
  });

  it("sin código útil usa un título genérico", () => {
    expect(tituloAutomatico("// solo un comentario", "python")).toBe("Código sin título (python)");
  });

  it("respeta el título del usuario y detecta el lenguaje si es auto", () => {
    expect(resolverMetadatos({ codigo: "def f():\n    return 1", lenguaje: "auto", titulo: "  Mi función " })).toEqual({ lenguaje: "python", titulo: "Mi función" });
    expect(resolverMetadatos({ codigo: "SELECT 1;", lenguaje: "sql" }).titulo).toBe("SELECT 1; (sql)");
  });
});
