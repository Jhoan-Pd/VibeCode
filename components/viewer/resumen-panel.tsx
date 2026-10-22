import { BookOpen, FileInput, FileOutput, Package } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Resumen } from "@/schemas/analysis";

/** Propósito, entradas, salidas y dependencias del código. */
export function ResumenCard({ resumen }: { resumen: Resumen }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" /> Resumen general
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="leading-relaxed">
          <TextoConCodigo texto={resumen.proposito} />
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <ListaResumen icono={<FileInput className="size-4" />} titulo="Entradas" items={resumen.entradas} />
          <ListaResumen icono={<FileOutput className="size-4" />} titulo="Salidas" items={resumen.salidas} />
          <ListaResumen icono={<Package className="size-4" />} titulo="Dependencias" items={resumen.dependencias} />
        </div>
      </CardContent>
    </Card>
  );
}

function ListaResumen({ icono, titulo, items }: { icono: React.ReactNode; titulo: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icono} {titulo}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>
                <TextoConCodigo texto={it} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResumenFaltante({ analisisId }: { analisisId?: string }) {
  if (!analisisId) return null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
        <span className="text-muted-foreground">El resumen general no se pudo generar.</span>
        <RegenerarEtapa analisisId={analisisId} etapa="resumen">Generar resumen</RegenerarEtapa>
      </CardContent>
    </Card>
  );
}
