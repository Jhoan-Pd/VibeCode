"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Barra de la vista para imprimir (no sale en el papel). Mientras está montada fuerza el modo claro
 * para que Mermaid dibuje los diagramas con fondo blanco; al salir restaura el tema del usuario.
 * "Guardar como PDF" lo hace el diálogo de impresión del navegador: sin dependencias pesadas en el servidor.
 */
export function BarraImpresion({ volverA }: { volverA: string }) {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const eraOscuro = html.classList.contains("dark");
    html.classList.remove("dark");
    // Espera a que Mermaid termine de dibujar en modo claro antes de habilitar el botón.
    const t = setTimeout(() => setListo(true), 800);
    return () => {
      clearTimeout(t);
      if (eraOscuro) html.classList.add("dark");
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 print:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link href={volverA}>
          <ArrowLeft /> Volver
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">En el diálogo de impresión elige «Guardar como PDF».</p>
      <Button size="sm" onClick={() => window.print()} disabled={!listo}>
        <Printer /> Imprimir o guardar PDF
      </Button>
    </div>
  );
}
