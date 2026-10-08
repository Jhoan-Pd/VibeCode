import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { AnalysisViewer } from "@/components/analysis-viewer";
import { AutoRefresh } from "@/components/auto-refresh";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { languageLabel } from "@/lib/language";
import { formatearFecha } from "@/lib/utils";
import type { Etapa } from "@/schemas/analysis";
import { NIVEL_INFO } from "@/schemas/common";
import { cargarAnalisis } from "@/services/vista.service";

export const metadata: Metadata = { title: "Resultado del análisis" };
export const dynamic = "force-dynamic";

/** Si un análisis lleva más de esto "procesando", se asume que la función serverless murió. */
const MINUTOS_PARA_CONSIDERAR_ATASCADO = 4;

const TEXTO_REGENERAR: Record<Etapa, string> = {
  resumen: "Regenerar resumen",
  lineas: "Regenerar explicación",
  diagrama: "Regenerar diagramas",
  glosario: "Generar glosario",
  auditoria: "Auditar código",
  quiz: "Generar quiz",
};

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/analysis/${id}`);

  // Filtrar por usuarioId evita que un usuario vea análisis ajenos (si no es suyo, responde 404).
  const cargado = await cargarAnalisis({ id, usuarioId: session.user.id }, { usuarioQuiz: session.user.id, incluirQuiz: true });
  if (!cargado) notFound();
  const { analisis, vista } = cargado;

  const minutos = (Date.now() - analisis.creadoEn.getTime()) / 60_000;
  const procesando = analisis.estado === "PROCESANDO" && minutos < MINUTOS_PARA_CONSIDERAR_ATASCADO;
  const atascado = analisis.estado === "PROCESANDO" && !procesando;
  const faltantes = (
    [
      !vista.resumen && "resumen",
      vista.bloques.length === 0 && "lineas",
      vista.diagramas.length === 0 && "diagrama",
      vista.conceptos.length === 0 && "glosario",
      !analisis.auditadoEn && "auditoria",
      !vista.quiz && "quiz",
    ] as const
  ).filter((x): x is Etapa => Boolean(x));

  return (
    <div className="container space-y-6 py-8">
      {procesando && <AutoRefresh />}

      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft /> Historial
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight">{analisis.titulo}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{languageLabel(analisis.lenguaje)}</Badge>
              <Badge variant="outline">Nivel {NIVEL_INFO[analisis.nivel].label.toLowerCase()}</Badge>
              <span>{formatearFecha(analisis.creadoEn)}</span>
            </div>
          </div>
          <DeleteAnalysisButton id={analisis.id} redirigirA="/dashboard" />
        </div>
      </div>

      {procesando && (
        <Alert variant="info" title="Este análisis todavía se está procesando">
          Se actualizará solo en unos segundos.
        </Alert>
      )}

      {(atascado || analisis.estado === "ERROR" || (analisis.estado === "COMPLETO" && faltantes.length > 0 && analisis.errorMensaje)) && (
        <Alert variant="error" title={analisis.estado === "ERROR" || atascado ? "El análisis no se pudo completar" : "Algunas secciones no se pudieron generar"}>
          <p>{analisis.errorMensaje ?? "El proceso se interrumpió antes de terminar."}</p>
          {faltantes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {faltantes.map((etapa) => (
                <RegenerarEtapa key={etapa} analisisId={analisis.id} etapa={etapa}>
                  {TEXTO_REGENERAR[etapa]}
                </RegenerarEtapa>
              ))}
            </div>
          )}
        </Alert>
      )}

      <AnalysisViewer analisisId={analisis.id} datos={vista} auditado={analisis.auditadoEn !== null} />
    </div>
  );
}
