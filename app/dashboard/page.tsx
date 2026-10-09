import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCode2, Plus, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { DeleteAnalysisButton } from "@/components/delete-analysis-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { languageLabel } from "@/lib/language";
import { formatearFecha } from "@/lib/utils";
import { NIVEL_INFO } from "@/schemas/common";

export const metadata: Metadata = { title: "Historial" };
export const dynamic = "force-dynamic";

const ESTADO_BADGE = {
  COMPLETO: { label: "Completo", variant: "success" },
  PROCESANDO: { label: "Procesando", variant: "warning" },
  PENDIENTE: { label: "Pendiente", variant: "secondary" },
  ERROR: { label: "Con errores", variant: "destructive" },
} as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const analisis = await db.analisis.findMany({
    where: { usuarioId: session.user.id },
    orderBy: { creadoEn: "desc" },
    take: 100,
    select: { id: true, titulo: true, lenguaje: true, nivel: true, estado: true, creadoEn: true, codigo: true },
  });

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tu historial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {analisis.length === 0 ? "Aún no has analizado nada." : `${analisis.length} análisis guardado${analisis.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/progreso">
              <TrendingUp /> Mi progreso
            </Link>
          </Button>
          <Button asChild>
            <Link href="/analyze">
              <Plus /> Nuevo análisis
            </Link>
          </Button>
        </div>
      </div>

      {analisis.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 border-dashed p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileCode2 />
          </span>
          <div>
            <h2 className="font-medium">Tu primer análisis te está esperando</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Pega ese código que la IA te generó y no terminas de entender. Aquí quedará guardado con su explicación y su diagrama.
            </p>
          </div>
          <Button asChild>
            <Link href="/analyze">Analizar mi primer código</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analisis.map((a) => {
            const estado = ESTADO_BADGE[a.estado];
            return (
              <li key={a.id}>
                <Card className="flex h-full flex-col justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                  <Link href={`/analysis/${a.id}`} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{a.titulo}</h2>
                      <Badge variant={estado.variant} className="shrink-0">
                        {estado.label}
                      </Badge>
                    </div>
                    <pre className="line-clamp-3 overflow-hidden whitespace-pre-wrap break-all rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-snug text-muted-foreground">
                      {a.codigo.slice(0, 220)}
                    </pre>
                  </Link>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Badge variant="outline">{languageLabel(a.lenguaje)}</Badge>
                      <Badge variant="outline">{NIVEL_INFO[a.nivel].label}</Badge>
                      <span>{formatearFecha(a.creadoEn)}</span>
                    </div>
                    <DeleteAnalysisButton id={a.id} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
