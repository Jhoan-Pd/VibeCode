"use client";

import type { MutableRefObject } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RangoLineas } from "@/lib/visor";
import { cn } from "@/lib/utils";
import type { Bloque } from "@/schemas/analysis";
import { etiquetaLineas } from "./boton-lineas";

export interface ExplicacionesPanelProps {
  bloques: Bloque[];
  activo: number | null;
  onActivar: (i: number) => void;
  /** Artículos del panel, para que el editor pueda desplazarlo hasta el bloque activo. */
  itemsRef: MutableRefObject<(HTMLElement | null)[]>;
  /** Si se indica, cada bloque ofrece «Preguntar sobre estas líneas». */
  onPreguntar?: (rango: RangoLineas) => void;
  analisisId?: string;
  className?: string;
}

/** Lista de explicaciones por bloque, sincronizada con el editor. */
export function ExplicacionesPanel({ bloques, activo, onActivar, itemsRef, onPreguntar, analisisId, className }: ExplicacionesPanelProps) {
  if (bloques.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <p>Todavía no hay explicación línea por línea para este código.</p>
            {analisisId && (
              <RegenerarEtapa analisisId={analisisId} etapa="lineas">
                Generar explicación
              </RegenerarEtapa>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} aria-label="Explicaciones por bloque">
      {bloques.map((b, i) => {
        const esActivo = activo === i;
        return (
          <article
            key={`${b.lineaInicio}-${i}`}
            ref={(el) => {
              itemsRef.current[i] = el;
            }}
            tabIndex={0}
            aria-current={esActivo}
            onMouseEnter={() => onActivar(i)}
            onFocus={() => onActivar(i)}
            onClick={() => onActivar(i)}
            className={cn("cursor-default rounded-lg border bg-card p-4 transition-colors", esActivo ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40")}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold leading-snug">{b.titulo}</h4>
              <Badge variant={esActivo ? "default" : "secondary"} className="shrink-0 font-mono">
                {etiquetaLineas(b.lineaInicio, b.lineaFin)}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <TextoConCodigo texto={b.explicacion} />
            </p>
            {onPreguntar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreguntar({ inicio: b.lineaInicio, fin: b.lineaFin });
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <MessageCircleQuestion className="size-3.5" /> Preguntar sobre estas líneas
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
