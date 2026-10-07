// Copia Monaco Editor a public/monaco/vs para servirlo desde el propio dominio (sin depender de un CDN).
// Se ejecuta en postinstall (también en Vercel). Omite las traducciones (nls.messages.*) para ahorrar ~1 MB.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "monaco-editor", "min", "vs");
const destino = join(raiz, "public", "monaco", "vs");

if (!existsSync(origen)) {
  console.warn("[copy-monaco] monaco-editor no está instalado todavía; se omite.");
  process.exit(0);
}
rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
cpSync(origen, destino, {
  recursive: true,
  filter: (src) => !/nls\.messages\.[a-z-]+\.js(\.map)?$/i.test(src),
});
console.log("[copy-monaco] Monaco copiado a public/monaco/vs");
