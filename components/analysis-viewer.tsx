"use client";

import { useCallback, useMemo, useState } from "react";
import { BookMarked, Code2, GitBranch, GraduationCap, MessageCircleQuestion, ShieldAlert } from "lucide-react";
import { MonacoEditor, OPCIONES_VISOR } from "@/components/code-editor";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/misc";
import { AuditoriaPanel } from "@/components/viewer/auditoria-panel";
import { ChatPanel } from "@/components/viewer/chat-panel";
import { DiagramasPanel } from "@/components/viewer/diagramas-panel";
import { ExplicacionesPanel } from "@/components/viewer/explicaciones-panel";
import { GlosarioPanel } from "@/components/viewer/glosario-panel";
import { QuizPanel, type QuizPanelProps } from "@/components/viewer/quiz-panel";
import { ResumenCard, ResumenFaltante } from "@/components/viewer/resumen-panel";
import { useEditorSincronizado } from "@/components/viewer/use-editor-sincronizado";
import { useIsDark } from "@/hooks/use-is-dark";
import { languageLabel } from "@/lib/language";
import { cn } from "@/lib/utils";
import { contarLineas, type RangoLineas } from "@/lib/visor";
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
  /** Rango a resaltar al abrir (enlaces "repasar" del dashboard de progreso: ?l=3-9). */
  focoInicial?: { inicio: number; fin: number } | null;
}

type Pestana = "codigo" | "diagramas" | "glosario" | "auditoria" | "quiz";
type PanelDerecho = "explicacion" | "chat";

export function AnalysisViewer({ datos, analisisId, auditado = true, calificarLocal, soloLectura = false, mensajesChat = [], focoInicial = null }: AnalysisViewerProps) {
  const { codigo, lenguaje, resumen, bloques, diagramas, conceptos, hallazgos, quiz } = datos;
  const oscuro = useIsDark();
  const [pestana, setPestana] = useState<Pestana>("codigo");
  const [panel, setPanel] = useState<PanelDerecho>("explicacion");
  const totalLineas = useMemo(() => contarLineas(codigo), [codigo]);

  const mostrarCodigo = useCallback(() => setPestana("codigo"), []);
  const editor = useEditorSincronizado({ bloques, totalLineas, focoInicial, alIrALineas: mostrarCodigo });

  const preguntarSobre = (rango: RangoLineas) => {
    editor.setSeleccion(rango);
    setPanel("chat");
  };

  const pestanas = [
    { id: "codigo" as const, label: <><Code2 className="size-4" /> Código y explicación</> },
    { id: "diagramas" as const, label: <><GitBranch className="size-4" /> Diagramas{diagramas.length > 1 ? ` (${diagramas.length})` : ""}</> },
    { id: "glosario" as const, label: <><BookMarked className="size-4" /> Glosario</> },
    { id: "auditoria" as const, label: <><ShieldAlert className="size-4" /> Auditoría{hallazgos.length > 0 ? ` (${hallazgos.length})` : ""}</> },
    ...(soloLectura ? [] : [{ id: "quiz" as const, label: <><GraduationCap className="size-4" /> Quiz</> }]),
  ];

  return (
    <div className="space-y-6">
      {resumen ? <ResumenCard resumen={resumen} /> : <ResumenFaltante analisisId={analisisId} />}

      <div className="space-y-4">
        <Tabs value={pestana} onChange={setPestana} items={pestanas} />

        {/* Se mantienen montados los dos paneles (con `hidden`) para no recargar Monaco al cambiar de pestaña. */}
        <div ref={editor.contenedorRef} className={cn("vd-fade scroll-mt-20", pestana !== "codigo" && "hidden")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
                <span className="font-mono">{languageLabel(lenguaje)}</span>
                <span>{totalLineas} líneas</span>
              </div>
              <div className="h-[44vh] min-h-[320px] lg:h-[70vh]">
                <MonacoEditor value={codigo} language={lenguaje} theme={oscuro ? "vs-dark" : "light"} options={OPCIONES_VISOR} onMount={editor.alMontar} />
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
                    seleccion={editor.seleccion}
                    limpiarSeleccion={() => editor.setSeleccion(null)}
                    irALineas={editor.irALineas}
                  />
                </div>
              ) : (
                <ExplicacionesPanel
                  bloques={bloques}
                  activo={editor.activo}
                  onActivar={(i) => editor.activar(i, "panel")}
                  itemsRef={editor.itemsRef}
                  onPreguntar={soloLectura ? undefined : preguntarSobre}
                  analisisId={analisisId}
                  className={cn("lg:overflow-y-auto lg:pr-1", soloLectura ? "lg:h-[calc(70vh+37px)]" : "lg:h-[calc(70vh-11px)]")}
                />
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

        <div className={cn("vd-fade", pestana !== "diagramas" && "hidden")}>
          <DiagramasPanel diagramas={diagramas} analisisId={analisisId} />
        </div>

        {pestana === "glosario" && (
          <div className="vd-fade">
            <GlosarioPanel conceptos={conceptos} irALineas={editor.irALineas} analisisId={analisisId} />
          </div>
        )}

        {pestana === "auditoria" && (
          <div className="vd-fade">
            <AuditoriaPanel hallazgos={hallazgos} auditado={auditado} irALineas={editor.irALineas} analisisId={analisisId} />
          </div>
        )}

        {/* El quiz se mantiene montado para no perder las respuestas al consultar el código. */}
        {!soloLectura && (
          <div className={cn("vd-fade", pestana !== "quiz" && "hidden")}>
            <QuizPanel key={quiz?.id ?? "sin-quiz"} quiz={quiz} irALineas={editor.irALineas} analisisId={analisisId} calificarLocal={calificarLocal} />
          </div>
        )}
      </div>
    </div>
  );
}
