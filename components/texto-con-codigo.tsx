import { Fragment } from "react";

/**
 * Convierte `texto` entre comillas invertidas en <code>. Se renderiza con nodos de React (no con
 * innerHTML), así que todo lo que venga del LLM queda escapado: no hay vía de inyección de HTML.
 */
export function TextoConCodigo({ texto }: { texto: string }) {
  const partes = texto.split(/`([^`]+)`/g);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
            {p}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
