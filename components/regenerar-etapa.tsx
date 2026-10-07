"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import type { Etapa } from "@/schemas/analysis";

/** Botón que vuelve a generar UNA etapa de un análisis (resumen, líneas o diagrama). */
export function RegenerarEtapa({
  analisisId,
  etapa,
  children = "Reintentar",
  ...props
}: { analisisId: string; etapa: Etapa } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${analisisId}/regenerar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ etapa }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo regenerar esta sección.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" size="sm" onClick={regenerar} disabled={cargando} {...props}>
        {cargando ? <Spinner /> : <RefreshCw />}
        {cargando ? "Generando…" : children}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
