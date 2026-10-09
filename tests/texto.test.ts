import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextoConCodigo } from "@/components/texto-con-codigo";

const html = (texto: string) => renderToStaticMarkup(createElement(TextoConCodigo, { texto }));

describe("TextoConCodigo", () => {
  it("convierte `código` y **negrita**", () => {
    const h = html("Usa **backoff exponencial** con `setTimeout`.");
    expect(h).toContain("<strong");
    expect(h).toContain(">backoff exponencial</strong>");
    expect(h).toMatch(/<code[^>]*>setTimeout<\/code>/);
    expect(h).not.toContain("**");
  });

  it("los asteriscos dentro del código no se toman como negrita", () => {
    const h = html("La espera es `500 * 2 ** i` y crece **rápido**.");
    expect(h).toMatch(/<code[^>]*>500 \* 2 \*\* i<\/code>/);
    expect(h).toContain(">rápido</strong>");
  });

  it("acepta código dentro de negrita", () => {
    expect(html("**`fetch`** puede fallar")).toMatch(/<strong[^>]*><code[^>]*>fetch<\/code><\/strong>/);
  });

  it("escapa el HTML que venga del LLM", () => {
    const h = html("<img src=x onerror=alert(1)> **<b>x</b>**");
    expect(h).not.toContain("<img");
    expect(h).toContain("&lt;img");
    expect(h).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("deja intactos los asteriscos sueltos", () => {
    expect(html("a * b y c ** d")).toBe("a * b y c ** d");
  });
});
