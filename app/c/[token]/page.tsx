import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Printer } from "lucide-react";
import { AnalysisViewer } from "@/components/analysis-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { esTokenValido } from "@/lib/compartir";
import { languageLabel } from "@/lib/language";
import { formatearFecha } from "@/lib/utils";
import { NIVEL_INFO } from "@/schemas/common";
import { cargarAnalisis } from "@/services/vista.service";

export const dynamic = "force-dynamic";

// Los enlaces compartidos no deben aparecer en buscadores.
export const metadata: Metadata = { title: "Análisis compartido", robots: { index: false, follow: false } };

/**
 * Vista pública de solo lectura. Solo se accede con el token (no con el id), no muestra datos del
 * autor, ni el chat, ni el quiz (que revelaría sus intentos), y no permite llamar al LLM.
 */
export default async function AnalisisCompartidoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!esTokenValido(token)) notFound();

  const cargado = await cargarAnalisis({ tokenPublico: token }, { usuarioQuiz: null, incluirQuiz: false });
  if (!cargado) notFound();
  const { analisis, vista } = cargado;

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-semibold tracking-tight">{analisis.titulo}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              <Eye className="size-3" /> Solo lectura
            </Badge>
            <Badge variant="outline">{languageLabel(analisis.lenguaje)}</Badge>
            <Badge variant="outline">Nivel {NIVEL_INFO[analisis.nivel].label.toLowerCase()}</Badge>
            <span>{formatearFecha(analisis.creadoEn)}</span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/c/${token}/imprimir`}>
            <Printer /> Imprimir o PDF
          </Link>
        </Button>
      </div>

      <Alert variant="info" title="Te compartieron este análisis">
        Lo generó VibeDecoder a partir de código escrito con IA. <Link href="/register" className="font-medium underline">Crea una cuenta gratis</Link> para
        analizar tu propio código, responder quizzes y preguntarle a la IA sobre cada línea.
      </Alert>

      <AnalysisViewer datos={vista} soloLectura />
    </div>
  );
}
