"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton, Spinner } from "@/components/ui/misc";
import { useIsDark } from "@/hooks/use-is-dark";
import type { TipoMermaid } from "@/lib/mermaid";

const ETIQUETA: Record<TipoMermaid, string> = {
  FLUJO: "Diagrama de flujo del código",
  CLASES: "Diagrama de clases del código",
  SECUENCIA: "Diagrama de secuencia del código",
};

type Estado = "cargando" | "ok" | "error";

/**
 * Renderiza Mermaid en el cliente. Flujo de robustez:
 *  1) mermaid.parse() valida la sintaxis ANTES de dibujar,
 *  2) si falla, se muestra un mensaje amigable (nunca la "bomba" de error de Mermaid),
 *  3) si hay `analisisId`, el usuario puede pedirle al LLM que lo corrija (/api/analysis/:id/diagrama).
 * Seguridad: securityLevel "strict" => Mermaid sanea el SVG (DOMPurify) y deshabilita click/HTML.
 */
export function MermaidDiagram({ codigo, analisisId, tipo = "FLUJO" }: { codigo: string; analisisId?: string; tipo?: TipoMermaid }) {
  const router = useRouter();
  const oscuro = useIsDark();
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [fuente, setFuente] = useState(codigo);
  const [svg, setSvg] = useState("");
  const [estado, setEstado] = useState<Estado>("cargando");
  const [errorParser, setErrorParser] = useState("");
  const [reparando, setReparando] = useState(false);
  const [errorReparar, setErrorReparar] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Si el servidor entrega un diagrama distinto (tras router.refresh), se sincroniza.
  useEffect(() => setFuente(codigo), [codigo]);

  useEffect(() => {
    let cancelado = false;
    setEstado("cargando");

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: oscuro ? "dark" : "default",
          suppressErrorRendering: true,
          flowchart: { htmlLabels: false, curve: "basis" },
          sequence: { useMaxWidth: true },
          class: { htmlLabels: false },
        });
        await mermaid.parse(fuente); // lanza si la sintaxis es inválida
        const { svg } = await mermaid.render(`mmd-${idBase}-${Date.now()}`, fuente);
        if (cancelado) return;
        setSvg(svg);
        setEstado("ok");
      } catch (e) {
        if (cancelado) return;
        setErrorParser(e instanceof Error ? e.message : String(e));
        setEstado("error");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [fuente, oscuro, idBase]);

  async function repararConIA() {
    if (!analisisId) return;
    setReparando(true);
    setErrorReparar(null);
    try {
      const res = await fetch(`/api/analysis/${analisisId}/diagrama`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: errorParser.slice(0, 1500), tipo }),
      });
      const data = (await res.json().catch(() => ({}))) as { mermaid?: string; error?: string };
      if (!res.ok || !data.mermaid) {
        setErrorReparar(data.error ?? "No se pudo corregir el diagrama.");
      } else {
        setFuente(data.mermaid);
        router.refresh();
      }
    } catch {
      setErrorReparar("Sin conexión con el servidor.");
    } finally {
      setReparando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(fuente);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <div className="space-y-3">
      {estado === "cargando" && (
        <div className="space-y-3 p-6" aria-busy="true" aria-label="Dibujando diagrama">
          <Skeleton className="mx-auto h-10 w-48" />
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto h-10 w-40" />
        </div>
      )}

      {estado === "ok" && (
        <div
          className="mermaid-host overflow-auto rounded-md p-4"
          role="img"
          aria-label={ETIQUETA[tipo]}
          // El SVG lo genera Mermaid con securityLevel "strict" (sanea el contenido).
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      {estado === "error" && (
        <Alert variant="error" title="No pudimos dibujar este diagrama">
          <p>La IA generó una sintaxis que Mermaid no acepta. Tu análisis y las explicaciones no se ven afectados.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {analisisId && (
              <Button size="sm" onClick={repararConIA} disabled={reparando}>
                {reparando ? <Spinner /> : <Wand2 />}
                {reparando ? "Corrigiendo…" : "Corregir con IA"}
              </Button>
            )}
          </div>
          {errorReparar && <p className="mt-2 text-xs text-destructive">{errorReparar}</p>}
        </Alert>
      )}

      <details className="rounded-md border bg-muted/40 text-sm print:hidden">
        <summary className="cursor-pointer select-none px-3 py-2 text-muted-foreground">Ver código Mermaid</summary>
        <div className="relative border-t">
          <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={copiar}>
            <Copy /> {copiado ? "Copiado" : "Copiar"}
          </Button>
          <pre className="overflow-auto p-3 pr-24 font-mono text-xs leading-relaxed">{fuente}</pre>
          {estado === "error" && errorParser && (
            <pre className="overflow-auto border-t p-3 font-mono text-xs text-destructive">{errorParser.slice(0, 600)}</pre>
          )}
        </div>
      </details>
    </div>
  );
}
