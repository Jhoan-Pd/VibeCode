import { describe, expect, it } from "vitest";
import { detectLanguage, languageFromFilename } from "@/lib/language";

const MUESTRAS: Record<string, string> = {
  javascript: `const items = [1, 2, 3];\nconst doble = items.map((x) => x * 2);\nconsole.log(doble);\nasync function load() { const r = await fetch("/api"); return r.json(); }`,
  typescript: `interface Usuario { id: number; nombre: string }\nexport function saludar(u: Usuario): string {\n  return \`Hola \${u.nombre}\`;\n}\ntype Id = string | number;`,
  python: `import os\n\ndef cargar(ruta: str) -> list:\n    with open(ruta) as f:\n        return [l.strip() for l in f]\n\nif __name__ == "__main__":\n    print(cargar("a.txt"))`,
  java: `import java.util.List;\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola");\n  }\n}`,
  csharp: `using System;\nnamespace App {\n  public class Programa {\n    public string Nombre { get; set; }\n    static void Main() { Console.WriteLine("Hola"); }\n  }\n}`,
  php: `<?php\nclass Usuario {\n  public function __construct(private string $nombre) {}\n  public function saludar() { echo "Hola " . $this->nombre; }\n}`,
  sql: `SELECT u.id, COUNT(p.id) AS pedidos\nFROM usuarios u\nLEFT JOIN pedidos p ON p.usuario_id = u.id\nWHERE u.activo = 1\nGROUP BY u.id\nORDER BY pedidos DESC;`,
  html: `<!DOCTYPE html>\n<html lang="es">\n<head><title>Hola</title></head>\n<body><div class="a"><p>Texto</p></div></body>\n</html>`,
  css: `.tarjeta {\n  display: flex;\n  padding: 1rem;\n  background: #fff;\n}\n@media (max-width: 600px) {\n  .tarjeta { display: block; }\n}`,
};

describe("detectLanguage", () => {
  for (const [esperado, codigo] of Object.entries(MUESTRAS)) {
    it(`detecta ${esperado}`, () => {
      expect(detectLanguage(codigo)).toBe(esperado);
    });
  }

  it("la extensión del archivo tiene prioridad", () => {
    expect(detectLanguage("lo que sea", "script.py")).toBe("python");
    expect(languageFromFilename("Program.CS")).toBe("csharp");
    expect(languageFromFilename("Makefile")).toBeNull();
  });

  it("devuelve plaintext si no hay evidencia", () => {
    expect(detectLanguage("hola mundo, esto es solo texto")).toBe("plaintext");
    expect(detectLanguage("")).toBe("plaintext");
  });
});
