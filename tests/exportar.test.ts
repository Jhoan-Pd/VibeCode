import { describe, expect, it } from "vitest";
import { DEMO_PREGUNTAS, DEMO_VISTA } from "@/lib/demo";
import { aMarkdown, cerco, escaparLinea, nombreArchivo } from "@/lib/exportar";
import type { AnalisisVista } from "@/schemas/vista";

const meta = { titulo: "Caché con TTL", nivel: "INTERMEDIO" as const, creadoEn: new Date("2026-10-08T12:00:00Z") };

describe("aMarkdown", () => {
  const md = aMarkdown(DEMO_VISTA, meta);

  it("incluye todas las secciones del análisis", () => {
    for (const seccion of ["# Caché con TTL", "## Resumen", "## Código", "## Explicación por bloques", "## Diagramas", "## Glosario", "## Auditoría de vibe code", "## Quiz de autoevaluación"]) {
      expect(md).toContain(seccion);
    }
    expect(md).toContain("nivel intermedio · 2026-10-08");
  });

  it("los diagramas van en bloques mermaid y cada bloque cita su rango y su fragmento", () => {
    expect(md.match(/```mermaid/g)?.length).toBe(DEMO_VISTA.diagramas.length);
    const b = DEMO_VISTA.bloques[0];
    expect(md).toContain(`### L${b.lineaInicio}${b.lineaFin === b.lineaInicio ? "" : `–${b.lineaFin}`}`);
    expect(md).toContain(DEMO_VISTA.codigo.split("\n")[b.lineaInicio - 1]);
  });

  it("nunca incluye las respuestas correctas del quiz", () => {
    for (const p of DEMO_PREGUNTAS) expect(md).not.toContain(p.explicacion);
    expect(md).toContain("Las respuestas no se incluyen");
  });

  it("conserva el código exacto, incluidas las líneas en blanco", () => {
    const codigo = "a = 1\n\n\n\nb = 2";
    const salida = aMarkdown({ ...vacio, codigo }, meta);
    expect(salida).toContain(codigo);
  });

  it("agrega el enlace público si existe y omite secciones vacías", () => {
    const salida = aMarkdown({ ...vacio, codigo: "x" }, { ...meta, enlace: "https://app.test/c/abc" });
    expect(salida).toContain("> Enlace público: https://app.test/c/abc");
    expect(salida).not.toContain("## Glosario");
    expect(salida).toContain("Sin hallazgos.");
  });
});

const vacio: AnalisisVista = { codigo: "", lenguaje: "python", resumen: null, bloques: [], diagramas: [], conceptos: [], hallazgos: [], quiz: null };

describe("utilidades", () => {
  it("el cerco es más largo que cualquier secuencia de comillas del contenido", () => {
    expect(cerco("print('hola')")).toBe("```");
    expect(cerco("texto ```js\nx\n```")).toBe("````");
    expect(cerco("````")).toBe("`````");
  });

  it("un título del LLM no puede inyectar estructura Markdown", () => {
    expect(escaparLinea("# Hola\n## [link](x)")).toBe("\\# Hola \\#\\# \\[link\\](x)");
  });

  it("nombre de archivo seguro", () => {
    expect(nombreArchivo("Caché con TTL (v2)!", "md")).toBe("cache-con-ttl-v2.md");
    expect(nombreArchivo("···", "md")).toBe("analisis.md");
    expect(nombreArchivo("../../etc/passwd", "md")).toBe("etc-passwd.md");
  });
});
