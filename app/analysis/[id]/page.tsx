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
import { db } from "@/lib/db";
import { languageLabel } from "@/lib/language";
import { formatearFecha } from "@/lib/utils";
import { ResumenSchema } from "@/schemas/analysis";
import { NIVEL_INFO } from "@/schemas/common";

export const metadata: Metadata = { title: "Resultado del análisis" };
export const dynamic = "force-dynamic";

/** Si un análisis lleva más de esto "procesando", se asume que la función serverless murió. */
const MINUTOS_PARA_CONSIDERAR_ATASCADO = 4;

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/analysis/${id}`);

  // Filtrar por usuarioId evita que un usuario vea análisis ajenos (si no es suyo, responde 404).
  const analisis = await db.analisis.findFirst({
    where: { id, usuarioId: session.user.id },
    include: {
      explicaciones: { orderBy: { orden: "asc" } },
      diagramas: { where: { tipo: "FLUJO" }, take: 1 },
    },
  });
  if (!analisis) notFound();

  // El JSON guardado se vuelve a validar: si el esquema cambió o el dato se corrompió, no rompe la página.
  const resumenParseado = ResumenSchema.safeParse(analisis.resumen);
  const resumen = resumenParseado.success ? resumenParseado.data : null;
  const diagrama = analisis.diagramas[0] ? { titulo: analisis.diagramas[0].titulo, mermaid: analisis.diagramas[0].codigoMermaid } : null;
  const bloques = analisis.explicaciones.map((e) => ({
    lineaInicio: e.lineaInicio,
    lineaFin: e.lineaFin,
    titulo: e.titulo,
    explicacion: e.explicacion,
  }));

  const minutos = (Date.now() - analisis.creadoEn.getTime()) / 60_000;
  const procesando = analisis.estado === "PROCESANDO" && minutos < MINUTOS_PARA_CONSIDERAR_ATASCADO;
  const atascado = analisis.estado === "PROCESANDO" && !procesando;
  const faltantes = [!resumen && "resumen", bloques.length === 0 && "lineas", !diagrama && "diagrama"].filter(Boolean) as ("resumen" | "lineas" | "diagrama")[];

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
                  {etapa === "resumen" ? "Regenerar resumen" : etapa === "lineas" ? "Regenerar explicación" : "Regenerar diagrama"}
                </RegenerarEtapa>
              ))}
            </div>
          )}
        </Alert>
      )}

      <AnalysisViewer
        analisisId={analisis.id}
        codigo={analisis.codigo}
        lenguaje={analisis.lenguaje}
        resumen={resumen}
        bloques={bloques}
        diagrama={diagrama}
      />
    </div>
  );
}
