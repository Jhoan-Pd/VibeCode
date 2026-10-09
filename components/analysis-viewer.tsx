"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoNS } from "monaco-editor";
import { BookMarked, BookOpen, Code2, FileInput, FileOutput, GitBranch, GraduationCap, MessageCircleQuestion, Package, ShieldAlert } from "lucide-react";
import { MonacoEditor, OPCIONES_VISOR } from "@/components/code-editor";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/misc";
import { AuditoriaPanel } from "@/components/viewer/auditoria-panel";
import { ChatPanel, type Seleccion } from "@/components/viewer/chat-panel";
import { DiagramasPanel } from "@/components/viewer/diagramas-panel";
import { GlosarioPanel } from "@/components/viewer/glosario-panel";
import { QuizPanel, type QuizPanelProps } from "@/components/viewer/quiz-panel";
import { useIsDark } from "@/hooks/use-is-dark";
import { cn } from "@/lib/utils";
import { languageLabel } from "@/lib/language";
import type { Resumen } from "@/schemas/analysis";
import type { MensajeChatVista } from "@/schemas/chat";
import type { AnalisisVista } from "@/schemas/vista";

export interface AnalysisViewerProps {
  datos: AnalisisVista;
  /** Si se indica, se habilitan "Reintentar", "Corregir diagrama con IA" y el quiz calificado en el servidor. */
  analisisId?: string;
  /** false si la auditoría todavía no se ha ejecutado (para no mostrar "sin hallazgos" por error). */
  auditado?: boolean;
  /** Solo la demo: califica el quiz en el navegador. */
  calificarLocal?: QuizPanelProps["calificarLocal"];
  /** Vista pública de solo lectura: oculta el quiz y el chat. */
  soloLectura?: boolean;
  /** Conversación previa del chat contextual (solo análisis propios). */
  mensajesChat?: MensajeChatVista[];
}

type Pestana = "codigo" | "diagramas" | "glosario" | "auditoria" | "quiz";
type PanelDerecho = "explicacion" | "chat";
type Origen = "panel" | "editor";

export function AnalysisViewer({ datos, analisisId, auditado = true, calificarLocal, soloLectura = false, mensajesChat = [] }: AnalysisViewerProps) {
  const { codigo, lenguaje, resumen, bloques, diagramas, conceptos, hallazgos, quiz } = datos;
  const oscuro = useIsDark();
  const [pestana, setPestana] = useState<Pestana>("codigo");
  const [activo, setActivo] = useState<number | null>(null);
  /** Rango resaltado desde el glosario, la auditoría o el quiz (distinto de los bloques). */
  const [foco, setFoco] = useState<{ inicio: number; fin: number; n: number } | null>(null);
  const [editorListo, setEditorListo] = useState(false);
  const [panel, setPanel] = useState<PanelDerecho>("explicacion");
  /** Líneas seleccionadas en el editor: contexto del chat. */
  const [seleccion, setSeleccion] = useState<Seleccion>(null);

  const editorRef = useRef<MonacoNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoracionesRef = useRef<MonacoNS.IEditorDecorationsCollection | null>(null);
  const origenRef = useRef<Origen>("panel");
  const activoRef = useRef<number | null>(null);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);
  const codigoRef = useRef<HTMLDivElement | null>(null);

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
    setFoco(null);
  }, []);

  /** Lleva al editor y resalta un rango (lo usan glosario, auditoría y quiz). */
  const irALineas = useCallback((inicio: number, fin: number) => {
    setPestana("codigo");
    setFoco((prev) => ({ inicio, fin, n: (prev?.n ?? 0) + 1 }));
  }, []);

  const alMontar = useCallback(
    (editor: MonacoNS.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      decoracionesRef.current = editor.createDecorationsCollection([]);

      // Editor -> panel: al pasar el mouse por una línea se activa su explicación.
      // Selección en el editor -> contexto del chat (si la selección termina al inicio de una línea, esa línea no cuenta).
      editor.onDidChangeCursorSelection((e) => {
        const s = e.selection;
        if (s.isEmpty()) return;
        const fin = s.endColumn === 1 && s.endLineNumber > s.startLineNumber ? s.endLineNumber - 1 : s.endLineNumber;
        setSeleccion({ inicio: s.startLineNumber, fin });
      });

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

    const marcas: MonacoNS.IModelDeltaDecoration[] = bloques.map((b, i) => ({
      range: new monaco.Range(b.lineaInicio, 1, b.lineaFin, 1),
      options:
        i === activo && !foco
          ? { isWholeLine: true, className: "vd-hl-line", linesDecorationsClassName: "vd-hl-gutter" }
          : { linesDecorationsClassName: "vd-has-explanation" },
    }));
    if (foco) {
      marcas.push({
        range: new monaco.Range(foco.inicio, 1, foco.fin, 1),
        options: { isWholeLine: true, className: "vd-foco-line", linesDecorationsClassName: "vd-foco-gutter" },
      });
    }
    coleccion.set(marcas);

    if (foco) {
      // El panel del editor acaba de mostrarse: se espera un cuadro para que Monaco recalcule su tamaño.
      const t = setTimeout(() => {
        editorRef.current?.layout();
        editorRef.current?.revealLinesInCenter(foco.inicio, foco.fin);
        codigoRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 60);
      return () => clearTimeout(t);
    }

    if (activo !== null) {
      const b = bloques[activo];
      if (origenRef.current === "panel") {
        editorRef.current?.revealLinesInCenterIfOutsideViewport(b.lineaInicio, b.lineaFin);
      } else {
        itemsRef.current[activo]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activo, bloques, editorListo, foco]);

  const lineas = useMemo(() => codigo.split("\n").length, [codigo]);

  return (
    <div className="space-y-6">
      {resumen ? <ResumenCard resumen={resumen} /> : <ResumenFaltante analisisId={analisisId} />}

      <div className="space-y-4">
        <Tabs
          value={pestana}
          onChange={setPestana}
          items={[
            { id: "codigo", label: <><Code2 className="size-4" /> Código y explicación</> },
            { id: "diagramas", label: <><GitBranch className="size-4" /> Diagramas{diagramas.length > 1 ? ` (${diagramas.length})` : ""}</> },
            { id: "glosario", label: <><BookMarked className="size-4" /> Glosario</> },
            { id: "auditoria", label: <><ShieldAlert className="size-4" /> Auditoría{hallazgos.length > 0 ? ` (${hallazgos.length})` : ""}</> },
            ...(soloLectura ? [] : [{ id: "quiz" as const, label: <><GraduationCap className="size-4" /> Quiz</> }]),
          ]}
        />

        {/* Se mantienen montados los dos paneles (con `hidden`) para no recargar Monaco al cambiar de pestaña. */}
        <div ref={codigoRef} className={cn("scroll-mt-20", pestana !== "codigo" && "hidden")}>
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

            <div className="space-y-3">
              {!soloLectura && (
                <Tabs
                  value={panel}
                  onChange={setPanel}
                  className="h-9"
                  items={[
                    { id: "explicacion", label: <>Explicación</> },
                    { id: "chat", label: <><MessageCircleQuestion className="size-4" /> Preguntar a la IA</> },
                  ]}
                />
              )}
              {panel === "chat" && !soloLectura ? (
                <div className="h-[60vh] lg:h-[calc(70vh-11px)]">
                  <ChatPanel
                    analisisId={analisisId}
                    mensajesIniciales={mensajesChat}
                    seleccion={seleccion}
                    limpiarSeleccion={() => setSeleccion(null)}
                    irALineas={irALineas}
                  />
                </div>
              ) : (
            <div
              className={cn("space-y-3 lg:overflow-y-auto lg:pr-1", soloLectura ? "lg:h-[calc(70vh+37px)]" : "lg:h-[calc(70vh-11px)]")}
              aria-label="Explicaciones por bloque"
            >
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
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSeleccion({ inicio: b.lineaInicio, fin: b.lineaFin });
                          setPanel("chat");
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        <MessageCircleQuestion className="size-3.5" /> Preguntar sobre estas líneas
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
              )}
            </div>
          </div>
          {bloques.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Pasa el mouse sobre una explicación para resaltar sus líneas en el editor, o sobre el código para ver su explicación.
              {!soloLectura && " Selecciona líneas en el editor para preguntarle a la IA sobre ellas."}
            </p>
          )}
        </div>

        <div className={cn(pestana !== "diagramas" && "hidden")}>
          <DiagramasPanel diagramas={diagramas} analisisId={analisisId} />
        </div>

        {pestana === "glosario" && <GlosarioPanel conceptos={conceptos} irALineas={irALineas} analisisId={analisisId} />}

        {pestana === "auditoria" && <AuditoriaPanel hallazgos={hallazgos} auditado={auditado} irALineas={irALineas} analisisId={analisisId} />}

        {/* El quiz se mantiene montado para no perder las respuestas al consultar el código. */}
        {!soloLectura && (
          <div className={cn(pestana !== "quiz" && "hidden")}>
            <QuizPanel key={quiz?.id ?? "sin-quiz"} quiz={quiz} irALineas={irALineas} analisisId={analisisId} calificarLocal={calificarLocal} />
          </div>
        )}
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
