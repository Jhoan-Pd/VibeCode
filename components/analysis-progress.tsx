import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { ETAPAS_UI } from "@/lib/analysis-events";
import { Spinner } from "@/components/ui/misc";
import type { Etapa } from "@/schemas/analysis";

export type EstadoEtapa = "pendiente" | "running" | "done" | "error";

/** Indicador de progreso por etapas (resumen, líneas, diagrama) alimentado por el stream del servidor. */
export function AnalysisProgress({ etapas, mensajes }: { etapas: Record<Etapa, EstadoEtapa>; mensajes?: Partial<Record<Etapa, string>> }) {
  return (
    <ol className="space-y-3" aria-live="polite" aria-label="Progreso del análisis">
      {ETAPAS_UI.map((e) => {
        const estado = etapas[e.id];
        return (
          <li key={e.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 items-center justify-center">
              {estado === "done" && <CheckCircle2 className="size-5 text-emerald-500" />}
              {estado === "running" && <Spinner className="size-4 text-primary" />}
              {estado === "error" && <AlertTriangle className="size-5 text-destructive" />}
              {estado === "pendiente" && <Circle className="size-5 text-muted-foreground/50" />}
            </span>
            <div>
              <p className={estado === "pendiente" ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{e.label}</p>
              <p className="text-xs text-muted-foreground">{estado === "error" && mensajes?.[e.id] ? mensajes[e.id] : e.detalle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
