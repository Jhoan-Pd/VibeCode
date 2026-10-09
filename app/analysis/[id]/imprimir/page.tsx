import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BarraImpresion } from "@/components/impresion/barra-impresion";
import { VistaImpresion } from "@/components/impresion/vista-impresion";
import { cargarAnalisis } from "@/services/vista.service";

export const metadata: Metadata = { title: "Imprimir análisis" };
export const dynamic = "force-dynamic";

export default async function ImprimirAnalisisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/analysis/${id}/imprimir`);

  const cargado = await cargarAnalisis({ id, usuarioId: session.user.id }, { usuarioQuiz: null, incluirQuiz: true });
  if (!cargado) notFound();
  const { analisis, vista } = cargado;

  return (
    <div className="container space-y-6 py-8 print:max-w-none print:p-0">
      <BarraImpresion volverA={`/analysis/${id}`} />
      <VistaImpresion datos={vista} titulo={analisis.titulo} nivel={analisis.nivel} creadoEn={analisis.creadoEn} />
    </div>
  );
}
