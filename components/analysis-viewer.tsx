"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoNS } from "monaco-editor";
import { BookOpen, FileInput, FileOutput, GitBranch, Package } from "lucide-react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { MonacoEditor, OPCIONES_VISOR } from "@/components/code-editor";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/misc";
import { useIsDark } from "@/hooks/use-is-dark";
import { cn } from "@/lib/utils";
import { languageLabel } from "@/lib/language";
import type { Bloque, Resumen } from "@/schemas/analysis";

export interface AnalysisViewerProps {
  codigo: string;
  lenguaje: string;
  resumen: Resumen | null;
  bloques: Bloque[];
  diagrama: { titulo: string; mermaid: string } | null;
  /** Si se indica, se habilitan "Reintentar" y "Corregir diagrama con IA". La demo no lo pasa. */
  analisisId?: string;
}

type Pestana = "codigo" | "diagrama";
type Origen = "panel" | "editor";

export function AnalysisViewer({ codigo, lenguaje, resumen, bloques, diagrama, analisisId }: AnalysisViewerProps) {
  const oscuro = useIsDark();
  const [pestana, setPestana] = useState<Pestana>("codigo");
  const [activo, setActivo] = useState<number | null>(null);
  const [editorListo, setEditorListo] = useState(false);

  const editorRef = useRef<MonacoNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoracionesRef = useRef<MonacoNS.IEditorDecorationsCollection | null>(null);
  const origenRef = useRef<Origen>("panel");
  const activoRef = useRef<number | null>(null);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);

  // línea -> índice del bloque que la explica (para el resaltado editor -> panel)
  const lineaABloque = useMemo(() => {
    const mapa = new Map<number, number>();
    bloques.forEach((b, i) => {
      for (let l = b.lineaInicio; l <= b.lineaFin; l++) mapa.set(l, i);
    });
    return mapa;
  }, [bloques]);
  const lineaABloqueRef = useRef(lineaABloque);
  lineaABloqueRef.current = lineaABloque;

  const activar = useCallback((indice: number, origen: Origen) => {
    if (activoRef.current === indice) return;
    origenRef.current = origen;
    activoRef.current = indice;
    setActivo(indice);
  }, []);

  const alMontar = useCallback(
    (editor: MonacoNS.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      decoracionesRef.current = editor.createDecorationsCollection([]);

      // Editor -> panel: al pasar el mouse por una línea se activa su explicación.
      editor.onMouseMove((e) => {
        const linea = e.target.position?.lineNumber;
        if (!linea) return;
        const indice = lineaABloqueRef.current.get(linea);
        if (indice !== undefined) activar(indice, "editor");
      });
      setEditorListo(true);
    },
    [activar],
  );

  // Panel -> editor: pinta las marcas de todos los bloques y resalta el activo.
  useEffect(() => {
    const monaco = monacoRef.current;
    const coleccion = decoracionesRef.current;
    if (!editorListo || !monaco || !coleccion) return;

    coleccion.set(
      bloques.map((b, i) => ({
        range: new monaco.Range(b.lineaInicio, 1, b.lineaFin, 1),
        options:
          i === activo
            ? { isWholeLine: true, className: "vd-hl-line", linesDecorationsClassName: "vd-hl-gutter" }
            : { linesDecorationsClassName: "vd-has-explanation" },
      })),
    );

    if (activo !== null) {
      const b = bloques[activo];
      if (origenRef.current === "panel") {
        editorRef.current?.revealLinesInCenterIfOutsideViewport(b.lineaInicio, b.lineaFin);
      } else {
        itemsRef.current[activo]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activo, bloques, editorListo]);

  const lineas = useMemo(() => codigo.split("\n").length, [codigo]);

  return (
    <div className="space-y-6">
      {resumen ? <ResumenCard resumen={resumen} /> : <ResumenFaltante analisisId={analisisId} />}

      <div className="space-y-4">
        <Tabs
          value={pestana}
          onChange={setPestana}
          items={[
            { id: "codigo", label: <>Código y explicación</> },
            { id: "diagrama", label: <><GitBranch className="size-4" /> Diagrama de flujo</> },
          ]}
        />

        {/* Se mantienen montados los dos paneles (con `hidden`) para no recargar Monaco al cambiar de pestaña. */}
        <div className={cn(pestana !== "codigo" && "hidden")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
                <span className="font-mono">{languageLabel(lenguaje)}</span>
                <span>{lineas} líneas</span>
              </div>
              <div className="h-[44vh] min-h-[320px] lg:h-[70vh]">
                <MonacoEditor
                  value={codigo}
                  language={lenguaje}
                  theme={oscuro ? "vs-dark" : "light"}
                  options={OPCIONES_VISOR}
                  onMount={alMontar}
                />
              </div>
            </Card>

            <div className="space-y-3 lg:h-[calc(70vh+37px)] lg:overflow-y-auto lg:pr-1" aria-label="Explicaciones por bloque">
              {bloques.length === 0 ? (
                <Card>
                  <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
                    <p>Todavía no hay explicación línea por línea para este código.</p>
                    {analisisId && <RegenerarEtapa analisisId={analisisId} etapa="lineas">Generar explicación</RegenerarEtapa>}
                  </CardContent>
                </Card>
              ) : (
                bloques.map((b, i) => (
                  <article
                    key={`${b.lineaInicio}-${i}`}
                    ref={(el) => {
                      itemsRef.current[i] = el;
                    }}
                    tabIndex={0}
                    aria-current={activo === i}
                    onMouseEnter={() => activar(i, "panel")}
                    onFocus={() => activar(i, "panel")}
                    onClick={() => activar(i, "panel")}
                    className={cn(
                      "cursor-default rounded-lg border bg-card p-4 transition-colors",
                      activo === i ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40",
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold leading-snug">{b.titulo}</h4>
                      <Badge variant={activo === i ? "default" : "secondary"} className="shrink-0 font-mono">
                        {b.lineaInicio === b.lineaFin ? `L${b.lineaInicio}` : `L${b.lineaInicio}–${b.lineaFin}`}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <TextoConCodigo texto={b.explicacion} />
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
          {bloques.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Pasa el mouse sobre una explicación para resaltar sus líneas en el editor, o sobre el código para ver su explicación.
            </p>
          )}
        </div>

        <div className={cn(pestana !== "diagrama" && "hidden")}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{diagrama?.titulo ?? "Diagrama de flujo"}</CardTitle>
            </CardHeader>
            <CardContent>
              {diagrama ? (
                <MermaidDiagram codigo={diagrama.mermaid} analisisId={analisisId} />
              ) : (
                <div className="space-y-3 py-4 text-sm text-muted-foreground">
                  <p>No se pudo generar el diagrama para este código.</p>
                  {analisisId && <RegenerarEtapa analisisId={analisisId} etapa="diagrama">Generar diagrama</RegenerarEtapa>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResumenCard({ resumen }: { resumen: Resumen }) {
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

function ResumenFaltante({ analisisId }: { analisisId?: string }) {
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
