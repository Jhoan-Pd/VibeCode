"use client";

import { Button } from "@/components/ui/button";

/** Límite de errores global: muestra un mensaje amigable y permite reintentar sin exponer detalles internos. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ocurrió un error inesperado. Puedes intentarlo de nuevo; si persiste, vuelve en unos minutos.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">ref: {error.digest}</p>}
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
