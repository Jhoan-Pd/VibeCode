import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarraImpresion } from "@/components/impresion/barra-impresion";
import { VistaImpresion } from "@/components/impresion/vista-impresion";
import { esTokenValido } from "@/lib/compartir";
import { cargarAnalisis } from "@/services/vista.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imprimir análisis compartido", robots: { index: false, follow: false } };

export default async function ImprimirCompartidoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!esTokenValido(token)) notFound();

  // Igual que la vista pública: sin quiz (el enlace es de solo lectura).
  const cargado = await cargarAnalisis({ tokenPublico: token }, { usuarioQuiz: null, incluirQuiz: false });
  if (!cargado) notFound();
  const { analisis, vista } = cargado;

  return (
    <div className="container space-y-6 py-8 print:max-w-none print:p-0">
      <BarraImpresion volverA={`/c/${token}`} />
      <VistaImpresion datos={vista} titulo={analisis.titulo} nivel={analisis.nivel} creadoEn={analisis.creadoEn} />
    </div>
  );
}
