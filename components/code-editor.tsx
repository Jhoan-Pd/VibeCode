"use client";

import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";
import { Skeleton } from "@/components/ui/misc";

/**
 * Monaco se carga solo en el cliente (usa `window`) y de forma diferida para no inflar el bundle inicial.
 * Los archivos del editor se sirven desde /monaco/vs (ver scripts/copy-monaco.mjs).
 */
export const MonacoEditor = dynamic<EditorProps>(
  () =>
    import("@monaco-editor/react").then((m) => {
      // Monaco se sirve desde /public/monaco (copiado en postinstall): sin CDN, funciona en redes restringidas.
      // La URL debe ser ABSOLUTA: los web workers de Monaco se crean desde un blob: y no resuelven rutas relativas.
      m.loader.config({ paths: { vs: `${window.location.origin}/monaco/vs` } });
      return m.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col gap-2 p-4" aria-label="Cargando editor">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${40 + ((i * 17) % 50)}%` }} />
        ))}
      </div>
    ),
  },
);

/** Opciones comunes para el editor de solo lectura del visor. */
export const OPCIONES_VISOR: NonNullable<EditorProps["options"]> = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineHeight: 21,
  lineNumbers: "on",
  renderLineHighlight: "none",
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 12,
  lineNumbersMinChars: 3,
  wordWrap: "on",
  padding: { top: 10, bottom: 10 },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  automaticLayout: true,
  contextmenu: false,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
};

/** Opciones del editor editable (pantalla de nuevo análisis). */
export const OPCIONES_EDITOR: NonNullable<EditorProps["options"]> = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineHeight: 21,
  wordWrap: "on",
  padding: { top: 10, bottom: 10 },
  automaticLayout: true,
  tabSize: 2,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
};
