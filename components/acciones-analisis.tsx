"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Link2, Link2Off, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";

/** Exportar (Markdown / PDF) y compartir con enlace público de solo lectura. */
export function AccionesAnalisis({ analisisId, tokenInicial }: { analisisId: string; tokenInicial: string | null }) {
  const [token, setToken] = useState(tokenInicial);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origen, setOrigen] = useState("");

  useEffect(() => setOrigen(window.location.origin), []);
  const url = token ? `${origen}/c/${token}` : "";

  async function cambiar(metodo: "POST" | "DELETE") {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${analisisId}/compartir`, { method: metodo });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar el enlace.");
        return;
      }
      setToken(metodo === "POST" ? (data.token ?? null) : null);
      setCopiado(false);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar: selecciona el enlace y cópialo a mano.");
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/api/analysis/${analisisId}/exportar`} download>
          <Download /> Markdown
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/analysis/${analisisId}/imprimir`}>
          <Printer /> PDF
        </Link>
      </Button>
      <Button variant={token ? "secondary" : "outline"} size="sm" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} aria-controls="panel-compartir">
        <Share2 /> {token ? "Compartido" : "Compartir"}
      </Button>

      {abierto && (
        <Card id="panel-compartir" className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,380px)] space-y-3 p-4 shadow-lg">
          <div>
            <p className="text-sm font-medium">Enlace público de solo lectura</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quien tenga el enlace verá el código, las explicaciones, los diagramas, el glosario y la auditoría. No verá tu nombre, tu chat ni tus
              resultados del quiz.
            </p>
          </div>
          {token ? (
            <>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  aria-label="Enlace público"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                />
                <Button size="sm" onClick={copiar} aria-label="Copiar enlace">
                  {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => cambiar("DELETE")} disabled={cargando} className="text-destructive hover:text-destructive">
                {cargando ? <Spinner /> : <Link2Off />} Dejar de compartir
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => cambiar("POST")} disabled={cargando}>
              {cargando ? <Spinner /> : <Link2 />} Crear enlace
            </Button>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </Card>
      )}
    </div>
  );
}
