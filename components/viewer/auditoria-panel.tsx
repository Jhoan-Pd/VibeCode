"use client";

import { Bug, FileX2, Ghost, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { HALLAZGO_INFO, SEVERIDAD_INFO, type HallazgoVista, type Severidad, type TipoHallazgo } from "@/schemas/vista";
import { BotonLineas, type IrALineas } from "./boton-lineas";

const ICONO: Record<TipoHallazgo, React.ComponentType<{ className?: string }>> = {
  SEGURIDAD: ShieldAlert,
  MALA_PRACTICA: TriangleAlert,
  CODIGO_MUERTO: FileX2,
  MANEJO_ERRORES: Bug,
  ALUCINACION: Ghost,
};

const SEVERIDADES_UI: Severidad[] = ["CRITICA", "ALTA", "MEDIA", "BAJA"];

/**
 * Auditoría de "vibe code". `auditado` distingue "sin hallazgos" (código limpio)
 * de "la auditoría aún no existe" (falló o es un análisis antiguo).
 */
export function AuditoriaPanel({
  hallazgos,
  auditado,
  irALineas,
  analisisId,
}: {
  hallazgos: HallazgoVista[];
  auditado: boolean;
  irALineas: IrALineas;
  analisisId?: string;
}) {
  if (!auditado) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>La auditoría de este código todavía no está disponible.</p>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="auditoria">
              Auditar código
            </RegenerarEtapa>
          )}
        </CardContent>
      </Card>
    );
  }

  const conteo = SEVERIDADES_UI.map((s) => ({ s, n: hallazgos.filter((h) => h.severidad === s).length })).filter((x) => x.n > 0);

  return (
    <div className="space-y-4">
      {hallazgos.length === 0 ? (
        <Alert variant="success" title="No encontramos problemas relevantes">
          La IA no detectó riesgos de seguridad, código muerto ni APIs dudosas. Aun así, revisa el código antes de usarlo en producción.
        </Alert>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {hallazgos.length} hallazgo{hallazgos.length === 1 ? "" : "s"}:
          </span>
          {conteo.map(({ s, n }) => (
            <Badge key={s} variant={SEVERIDAD_INFO[s].variant}>
              {n} {SEVERIDAD_INFO[s].label.toLowerCase()}
              {n === 1 ? "" : "s"}
            </Badge>
          ))}
        </div>
      )}

      <ul className="space-y-3" aria-label="Hallazgos de la auditoría">
        {hallazgos.map((h, i) => {
          const Icono = ICONO[h.tipo];
          return (
            <li key={`${h.titulo}-${i}`}>
              <Card className={h.severidad === "CRITICA" ? "border-destructive/50" : undefined}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-snug">{h.titulo}</h3>
                        <p className="text-xs text-muted-foreground">{HALLAZGO_INFO[h.tipo]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BotonLineas inicio={h.lineaInicio} fin={h.lineaFin} irALineas={irALineas} />
                      <Badge variant={SEVERIDAD_INFO[h.severidad].variant}>{SEVERIDAD_INFO[h.severidad].label}</Badge>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <TextoConCodigo texto={h.descripcion} />
                  </p>
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck className="size-3.5" /> Sugerencia
                    </p>
                    <p className="leading-relaxed">
                      <TextoConCodigo texto={h.sugerencia} />
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        La auditoría la hace un modelo de IA: puede equivocarse o pasar por alto problemas. Úsala como guía, no como garantía.
      </p>
    </div>
  );
}
