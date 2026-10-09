import { Fragment, type ReactNode } from "react";

/** Marcador interno para proteger el código mientras se busca la negrita (no aparece en texto normal). */
const MARCA = "\u0000";

/**
 * Formato mínimo para el texto que devuelve el LLM: `código` se muestra como <code> y **negrita**
 * como <strong>. Se renderiza con nodos de React (no con innerHTML), así que todo lo que venga del
 * LLM queda escapado: no hay vía de inyección de HTML.
 */
export function TextoConCodigo({ texto }: { texto: string }) {
  return <>{formatear(texto.replaceAll(MARCA, ""))}</>;
}

/**
 * El código se aparta primero (así `2 ** i` no se confunde con negrita) y luego se aplica la
 * negrita, que puede contener código: **`fetch`** también funciona.
 */
export function formatear(texto: string): ReactNode[] {
  const codigos: string[] = [];
  const protegido = texto.replace(/`([^`]+)`/g, (_, c: string) => `${MARCA}${codigos.push(c) - 1}${MARCA}`);

  const conCodigo = (fragmento: string, base: string): ReactNode[] =>
    fragmento.split(new RegExp(`${MARCA}(\\d+)${MARCA}`, "g")).map((p, i) =>
      i % 2 === 1 ? (
        <code key={`${base}-${i}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
          {codigos[Number(p)]}
        </code>
      ) : (
        <Fragment key={`${base}-${i}`}>{p}</Fragment>
      ),
    );

  return protegido.split(/\*\*([^*\n]+)\*\*/g).map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {conCodigo(p, `b${i}`)}
      </strong>
    ) : (
      <Fragment key={i}>{conCodigo(p, `t${i}`)}</Fragment>
    ),
  );
}
