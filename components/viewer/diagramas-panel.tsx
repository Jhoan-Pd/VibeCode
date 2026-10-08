"use client";

import { useState } from "react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/misc";
import type { TipoMermaid } from "@/lib/mermaid";
import { cn } from "@/lib/utils";
import { DIAGRAMA_INFO, type DiagramaVista } from "@/schemas/vista";

/** Diagramas del análisis: flujo siempre; clases y secuencia solo si el LLM consideró que aplican. */
export function DiagramasPanel({ diagramas, analisisId }: { diagramas: DiagramaVista[]; analisisId?: string }) {
  const [tipo, setTipo] = useState<TipoMermaid>(diagramas[0]?.tipo ?? "FLUJO");

  if (diagramas.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>No se pudo generar el diagrama para este código.</p>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="diagrama">
              Generar diagramas
            </RegenerarEtapa>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {diagramas.length > 1 && (
        <Tabs value={tipo} onChange={setTipo} items={diagramas.map((d) => ({ id: d.tipo, label: DIAGRAMA_INFO[d.tipo] }))} />
      )}
      {/* Todos montados: Mermaid no vuelve a dibujar al cambiar de pestaña. */}
      {diagramas.map((d) => (
        <Card key={d.tipo} className={cn(d.tipo !== tipo && "hidden")}>
          <CardHeader className="pb-2">
            <CardTitle>{d.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <MermaidDiagram codigo={d.mermaid} analisisId={analisisId} tipo={d.tipo} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
