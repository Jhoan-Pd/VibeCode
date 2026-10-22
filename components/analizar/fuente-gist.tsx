"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { languageLabel } from "@/lib/language";
import type { GistArchivo } from "./use-fuente-codigo";

/** Carga un Gist público; si tiene varios archivos, deja elegir uno. */
export function FuenteGist({
  cargando,
  archivos,
  onCargar,
  onElegir,
}: {
  cargando: boolean;
  archivos: GistArchivo[];
  onCargar: (url: string) => void;
  onElegir: (a: GistArchivo) => void;
}) {
  const [url, setUrl] = useState("");
  const puedeCargar = !cargando && url.trim() !== "";

  return (
    <div className="min-h-[300px] space-y-4 p-5">
      <div className="space-y-2">
        <Label htmlFor="gist-url">URL de un Gist público</Label>
        <div className="flex gap-2">
          <Input
            id="gist-url"
            inputMode="url"
            placeholder="https://gist.github.com/usuario/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && puedeCargar && onCargar(url)}
          />
          <Button type="button" onClick={() => onCargar(url)} disabled={!puedeCargar}>
            {cargando ? <Spinner /> : null} Cargar
          </Button>
        </div>
      </div>
      {archivos.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Este Gist tiene varios archivos. Elige uno:</p>
          <ul className="space-y-2">
            {archivos.map((a) => (
              <li key={a.nombre}>
                <Button type="button" variant="outline" className="w-full justify-between" onClick={() => onElegir(a)}>
                  <span className="truncate font-mono text-xs">{a.nombre}</span>
                  <span className="text-xs text-muted-foreground">{languageLabel(a.lenguaje)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
