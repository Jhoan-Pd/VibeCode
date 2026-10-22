"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXTENSIONES = ".js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.cs,.php,.sql,.html,.htm,.css,.txt";

/** Zona para soltar o elegir un archivo de código. */
export function FuenteArchivo({ onArchivo }: { onArchivo: (f: File) => void }) {
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onArchivo(f);
        }}
        className={cn(
          "flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          arrastrando ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm">Arrastra un archivo de código aquí</p>
        <p className="text-xs text-muted-foreground">JS, TS, Python, Java, C#, PHP, SQL, HTML o CSS</p>
        <Button type="button" variant="outline" onClick={() => input.current?.click()}>
          Elegir archivo
        </Button>
        <input
          ref={input}
          type="file"
          accept={EXTENSIONES}
          className="sr-only"
          aria-label="Subir archivo de código"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onArchivo(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
