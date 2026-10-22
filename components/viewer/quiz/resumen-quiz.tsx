"use client";

import { GraduationCap, RotateCcw } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatearFecha } from "@/lib/utils";
import { UMBRAL_APROBACION, type ResultadoQuiz } from "@/schemas/quiz";
import type { QuizVista } from "@/schemas/vista";
import { BotonLineas, type IrALineas } from "../boton-lineas";

/** Puntaje, nivel de comprensión y líneas a repasar tras calificar. */
export function ResumenQuiz({
  resultado,
  irALineas,
  onReintentar,
  analisisId,
}: {
  resultado: ResultadoQuiz;
  irALineas: IrALineas;
  onReintentar: () => void;
  analisisId?: string;
}) {
  const aprobado = resultado.porcentaje >= UMBRAL_APROBACION;
  return (
    <Card className={cn("vd-pop", aprobado ? "border-emerald-500/40" : "border-amber-500/40")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-3">
          <GraduationCap className="size-5 text-primary" />
          <span className="tabular-nums">{resultado.porcentaje}%</span>
          <Badge variant={aprobado ? "success" : "warning"}>Comprensión {resultado.nivelComprension.toLowerCase()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Acertaste {resultado.aciertos} de {resultado.total}.{" "}
          {aprobado ? "¡Entiendes este código! Revisa abajo la explicación de cada respuesta." : "Todavía hay partes que conviene repasar antes de usar este código."}
        </p>
        {resultado.repasar.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium">Te recomendamos repasar:</p>
            <ul className="flex flex-wrap gap-2">
              {resultado.repasar.map((r) => (
                <li key={`${r.lineaInicio}-${r.lineaFin}`}>
                  <BotonLineas inicio={r.lineaInicio} fin={r.lineaFin} irALineas={irALineas} texto={r.concepto ?? "Repasar"} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReintentar}>
            <RotateCcw /> Intentar de nuevo
          </Button>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="quiz">
              Generar otro quiz
            </RegenerarEtapa>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Historial de los últimos intentos del usuario en este quiz. */
export function IntentosAnteriores({ intentos }: { intentos: QuizVista["intentos"] }) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tus intentos anteriores</h4>
      <ul className="space-y-1 text-sm">
        {intentos.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{formatearFecha(it.creadoEn)}</span>
            <span className="tabular-nums">
              {it.porcentaje}% · {it.nivelComprension}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
