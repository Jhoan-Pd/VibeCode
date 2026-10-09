import { Fragment } from "react";
import { TextoConCodigo } from "@/components/texto-con-codigo";

/**
 * Markdown MUY reducido para las respuestas del chat: bloques ``` de código, listas con guiones o
 * números, **negrita** y `código en línea`. Todo se construye con nodos de React (nunca innerHTML),
 * así que cualquier HTML que devuelva el LLM se muestra como texto y no se ejecuta.
 */
export function TextoChat({ texto }: { texto: string }) {
  const partes = texto.split(/```[a-zA-Z0-9+#-]*\n?([\s\S]*?)```/g);
  return (
    <div className="space-y-2">
      {partes.map((parte, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
            {parte.replace(/\n$/, "")}
          </pre>
        ) : (
          <Fragment key={i}>{bloquesDeTexto(parte)}</Fragment>
        ),
      )}
    </div>
  );
}

function bloquesDeTexto(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((bloque, i) => {
      const lineas = bloque.split("\n");
      const esLista = lineas.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
      if (esLista) {
        const ordenada = /^\s*\d/.test(lineas[0]);
        const items = lineas.map((l, j) => (
          <li key={j}>
            <EnLinea texto={l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")} />
          </li>
        ));
        return ordenada ? (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        );
      }
      return (
        <p key={i} className="whitespace-pre-line">
          <EnLinea texto={bloque} />
        </p>
      );
    });
}

/** **negrita** + `código` en línea. */
function EnLinea({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            <TextoConCodigo texto={p} />
          </strong>
        ) : (
          <TextoConCodigo key={i} texto={p} />
        ),
      )}
    </>
  );
}
