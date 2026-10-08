"use client";

import { BookMarked } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Card, CardContent } from "@/components/ui/card";
import type { ConceptoVista } from "@/schemas/vista";
import { BotonLineas, type IrALineas } from "./boton-lineas";

/** Glosario de conceptos usados en el código, cada uno con enlace a la línea donde aparece. */
export function GlosarioPanel({ conceptos, irALineas, analisisId }: { conceptos: ConceptoVista[]; irALineas: IrALineas; analisisId?: string }) {
  if (conceptos.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Todavía no hay glosario para este código.</p>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="glosario">
              Generar glosario
            </RegenerarEtapa>
          )}
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Glosario de conceptos">
      {conceptos.map((c) => (
        <li key={c.nombre}>
          <Card className="h-full">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <BookMarked className="size-4 shrink-0 text-primary" />
                  {c.nombre}
                </h3>
                <BotonLineas inicio={c.lineaInicio} fin={c.lineaFin} irALineas={irALineas} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <TextoConCodigo texto={c.explicacion} />
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
