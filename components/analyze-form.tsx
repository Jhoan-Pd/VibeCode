"use client";

import { useState } from "react";
import { ClipboardPaste, FileUp, Github } from "lucide-react";
import { AjustesAnalisis } from "@/components/analizar/ajustes-analisis";
import { FuenteArchivo } from "@/components/analizar/fuente-archivo";
import { FuenteGist } from "@/components/analizar/fuente-gist";
import { useAnalisis } from "@/components/analizar/use-analisis";
import { useFuenteCodigo } from "@/components/analizar/use-fuente-codigo";
import { AnalysisProgress } from "@/components/analysis-progress";
import { MonacoEditor, OPCIONES_EDITOR } from "@/components/code-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner, Tabs } from "@/components/ui/misc";
import { useIsDark } from "@/hooks/use-is-dark";
import { MAX_CODE_CHARS } from "@/lib/config";
import type { EstadoCupo } from "@/lib/limites";
import { cn, formatearNumero } from "@/lib/utils";
import type { NivelUsuario } from "@/schemas/common";

const PESTANAS = [
  { id: "pegar" as const, label: <><ClipboardPaste className="size-4" /> Pegar</> },
  { id: "archivo" as const, label: <><FileUp className="size-4" /> Archivo</> },
  { id: "gist" as const, label: <><Github className="size-4" /> Gist</> },
];

/**
 * Formulario de análisis. Compone dos hooks —de dónde sale el código (useFuenteCodigo) y el análisis
 * por streaming (useAnalisis)— con componentes de presentación para cada fuente y para los ajustes.
 */
export function AnalyzeForm({ nivelInicial, cupo }: { nivelInicial: NivelUsuario; cupo: EstadoCupo }) {
  const oscuro = useIsDark();
  const f = useFuenteCodigo();
  const { fase, progreso, error, analizar } = useAnalisis();
  const [nivel, setNivel] = useState<NivelUsuario>(nivelInicial);
  const [forzar, setForzar] = useState(false);

  const largo = f.codigo.length;
  const excede = largo > MAX_CODE_CHARS;
  const vacio = f.codigo.trim().length < 3;

  const iniciar = () => analizar({ codigo: f.codigo, lenguaje: f.lenguajeSel, nivel, titulo: f.titulo || undefined, forzar });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ---------- Entrada de código ---------- */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <Tabs value={f.fuente} onChange={f.setFuente} items={PESTANAS} />
          <span className={cn("text-xs tabular-nums", excede ? "font-medium text-destructive" : "text-muted-foreground")} aria-live="polite">
            {formatearNumero(largo)} / {formatearNumero(MAX_CODE_CHARS)} caracteres
          </span>
        </div>

        {f.error && (
          <Alert key={f.error} variant="error" className="vd-shake m-3">
            {f.error}
          </Alert>
        )}

        {f.fuente === "pegar" && (
          <div className="relative h-[52vh] min-h-[340px]">
            <MonacoEditor
              value={f.codigo}
              language={f.lenguajeEfectivo}
              theme={oscuro ? "vs-dark" : "light"}
              options={OPCIONES_EDITOR}
              onChange={(v) => f.editar(v ?? "")}
            />
            {largo === 0 && (
              <p className="pointer-events-none absolute left-14 top-3 max-w-md text-sm text-muted-foreground/70">
                Pega aquí el código que generó la IA y que no terminas de entender…
              </p>
            )}
          </div>
        )}

        {f.fuente === "archivo" && <FuenteArchivo onArchivo={(archivo) => void f.leerArchivo(archivo)} />}

        {f.fuente === "gist" && (
          <FuenteGist
            cargando={f.gistCargando}
            archivos={f.gistArchivos}
            onCargar={(url) => void f.cargarGist(url)}
            onElegir={(a) => f.cargarCodigo(a.contenido, a.nombre)}
          />
        )}
      </Card>

      {/* ---------- Ajustes / progreso ---------- */}
      <Card className="h-fit">
        {fase === "analizando" ? (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Spinner className="text-primary" /> Analizando tu código…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnalysisProgress etapas={progreso.etapas} mensajes={progreso.mensajes} />
              <p className="text-xs text-muted-foreground">Suele tardar entre 15 y 50 segundos según el tamaño del código. No cierres esta pestaña.</p>
            </CardContent>
          </>
        ) : (
          <AjustesAnalisis
            titulo={f.titulo}
            onTitulo={f.setTitulo}
            lenguaje={f.lenguajeSel}
            onLenguaje={f.setLenguajeSel}
            detectado={!vacio && f.lenguajeSel === "auto" ? f.detectado : null}
            nivel={nivel}
            onNivel={setNivel}
            forzar={forzar}
            onForzar={setForzar}
            error={fase === "error" ? error : null}
            cupo={cupo}
            excede={excede}
            puedeAnalizar={!vacio && !excede}
            onAnalizar={iniciar}
          />
        )}
      </Card>
    </div>
  );
}
