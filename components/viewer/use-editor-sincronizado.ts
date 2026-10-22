"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoNS } from "monaco-editor";
import { bloqueDeLinea, indicePorLinea, rangoDeSeleccion, type RangoLineas } from "@/lib/visor";
import type { Bloque } from "@/schemas/analysis";

/** Quién activó el bloque: define si se desplaza el editor (desde el panel) o el panel (desde el editor). */
type Origen = "panel" | "editor";
type Foco = RangoLineas & { n: number };

const DECORACION_ACTIVA = { isWholeLine: true, className: "vd-hl-line", linesDecorationsClassName: "vd-hl-gutter" };
const DECORACION_BLOQUE = { linesDecorationsClassName: "vd-has-explanation" };
const DECORACION_FOCO = { isWholeLine: true, className: "vd-foco-line", linesDecorationsClassName: "vd-foco-gutter" };

/**
 * Sincroniza Monaco con el panel de explicaciones (Observer en ambos sentidos):
 *  - editor → panel: pasar el mouse por una línea activa su bloque; seleccionar líneas fija el contexto del chat;
 *  - panel → editor: el bloque activo y el «foco» (desde glosario, auditoría o quiz) se pintan como decoraciones.
 * Todo lo que toca refs e instancias de Monaco vive aquí; el componente solo recibe estado y callbacks.
 */
export function useEditorSincronizado({
  bloques,
  totalLineas,
  focoInicial,
  alIrALineas,
}: {
  bloques: Bloque[];
  totalLineas: number;
  focoInicial: RangoLineas | null;
  /** Se llama antes de resaltar un rango (p. ej. para cambiar a la pestaña del código). */
  alIrALineas: () => void;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [foco, setFoco] = useState<Foco | null>(focoInicial ? { ...focoInicial, n: 0 } : null);
  const [seleccion, setSeleccion] = useState<RangoLineas | null>(null);
  const [editorListo, setEditorListo] = useState(false);

  const editorRef = useRef<MonacoNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoracionesRef = useRef<MonacoNS.IEditorDecorationsCollection | null>(null);
  const origenRef = useRef<Origen>("panel");
  const activoRef = useRef<number | null>(null);
  /** Artículos del panel, para desplazarlo hasta el bloque activo. */
  const itemsRef = useRef<(HTMLElement | null)[]>([]);
  /** Contenedor del código, para llevarlo a la vista al enfocar un rango. */
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const indice = useMemo(() => indicePorLinea(bloques, totalLineas), [bloques, totalLineas]);
  // Los listeners de Monaco se registran una vez: leen el índice actual por ref.
  const indiceRef = useRef(indice);
  indiceRef.current = indice;

  const activar = useCallback((i: number, origen: Origen) => {
    if (activoRef.current === i) return;
    origenRef.current = origen;
    activoRef.current = i;
    setActivo(i);
    setFoco(null);
  }, []);

  const irALineas = useCallback(
    (inicio: number, fin: number) => {
      alIrALineas();
      // `n` cambia en cada clic para que el efecto se repita aunque el rango sea el mismo.
      setFoco((prev) => ({ inicio, fin, n: (prev?.n ?? 0) + 1 }));
    },
    [alIrALineas],
  );

  const alMontar = useCallback(
    (editor: MonacoNS.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      decoracionesRef.current = editor.createDecorationsCollection([]);
      editor.onDidChangeCursorSelection(({ selection }) => {
        if (!selection.isEmpty()) setSeleccion(rangoDeSeleccion(selection));
      });
      editor.onMouseMove((e) => {
        const linea = e.target.position?.lineNumber;
        const i = linea ? bloqueDeLinea(indiceRef.current, linea) : null;
        if (i !== null) activar(i, "editor");
      });
      setEditorListo(true);
    },
    [activar],
  );

  // Panel → editor: pinta las marcas de todos los bloques, el activo y el foco, y desplaza lo necesario.
  useEffect(() => {
    const monaco = monacoRef.current;
    const coleccion = decoracionesRef.current;
    if (!editorListo || !monaco || !coleccion) return;

    const marcas: MonacoNS.IModelDeltaDecoration[] = bloques.map((b, i) => ({
      range: new monaco.Range(b.lineaInicio, 1, b.lineaFin, 1),
      options: i === activo && !foco ? DECORACION_ACTIVA : DECORACION_BLOQUE,
    }));
    if (foco) marcas.push({ range: new monaco.Range(foco.inicio, 1, foco.fin, 1), options: DECORACION_FOCO });
    coleccion.set(marcas);

    if (foco) {
      // El panel del editor acaba de mostrarse: se espera un cuadro para que Monaco recalcule su tamaño.
      const t = setTimeout(() => {
        editorRef.current?.layout();
        editorRef.current?.revealLinesInCenter(foco.inicio, foco.fin);
        contenedorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 60);
      return () => clearTimeout(t);
    }

    if (activo !== null) {
      const b = bloques[activo];
      if (origenRef.current === "panel") editorRef.current?.revealLinesInCenterIfOutsideViewport(b.lineaInicio, b.lineaFin);
      else itemsRef.current[activo]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activo, bloques, editorListo, foco]);

  return { activo, activar, irALineas, seleccion, setSeleccion, alMontar, itemsRef, contenedorRef };
}
