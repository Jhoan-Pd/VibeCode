"use client";

import { Code2 } from "lucide-react";

export type IrALineas = (inicio: number, fin: number) => void;

export function etiquetaLineas(inicio: number, fin: number | null) {
  return fin == null || fin === inicio ? `L${inicio}` : `L${inicio}–${fin}`;
}

/** Botón que lleva al editor y resalta un rango de líneas. No se muestra si no hay rango. */
export function BotonLineas({ inicio, fin, irALineas, texto }: { inicio: number | null; fin: number | null; irALineas?: IrALineas; texto?: string }) {
  if (inicio == null) return null;
  const etiqueta = etiquetaLineas(inicio, fin);
  if (!irALineas) return <span className="font-mono text-xs text-muted-foreground">{etiqueta}</span>;
  return (
    <button
      type="button"
      onClick={() => irALineas(inicio, fin ?? inicio)}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${texto ?? "Ver en el código"}: líneas ${etiqueta.slice(1)}`}
    >
      <Code2 className="size-3" /> {texto ? `${texto} ${etiqueta}` : etiqueta}
    </button>
  );
}
