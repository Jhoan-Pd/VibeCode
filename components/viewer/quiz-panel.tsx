"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, GraduationCap, RotateCcw, Send, XCircle } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/misc";
import { cn, formatearFecha } from "@/lib/utils";
import {
  TIPO_PREGUNTA_INFO,
  UMBRAL_APROBACION,
  type PreguntaPublica,
  type RespuestaValor,
  type ResultadoPregunta,
  type ResultadoQuiz,
} from "@/schemas/quiz";
import type { QuizVista } from "@/schemas/vista";
import { BotonLineas, etiquetaLineas, type IrALineas } from "./boton-lineas";

type Respuestas = Record<string, RespuestaValor | null>;

export interface QuizPanelProps {
  quiz: QuizVista | null;
  irALineas: IrALineas;
  /** Análisis propio: califica en el servidor y permite generar otro quiz. */
  analisisId?: string;
  /** Demo de la landing: califica en el navegador con las respuestas de ejemplo. */
  calificarLocal?: (respuestas: Respuestas) => ResultadoQuiz;
}

function respuestasIniciales(preguntas: PreguntaPublica[]): Respuestas {
  // ORDENAR arranca con el orden mostrado (el servidor ya lo barajó); el resto, sin responder.
  return Object.fromEntries(preguntas.map((p) => [p.id, p.tipo === "ORDENAR" ? (p.opciones ?? []).map((_, i) => i) : null]));
}

export function QuizPanel({ quiz, irALineas, analisisId, calificarLocal }: QuizPanelProps) {
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasIniciales(quiz?.preguntas ?? []));
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!quiz || quiz.preguntas.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Todavía no hay quiz para este código.</p>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="quiz">
              Generar quiz
            </RegenerarEtapa>
          )}
        </CardContent>
      </Card>
    );
  }

  const sinResponder = quiz.preguntas.filter((p) => respuestas[p.id] === null || respuestas[p.id] === undefined).length;

  async function enviar() {
    if (!quiz) return;
    setError(null);
    if (calificarLocal) {
      setResultado(calificarLocal(respuestas));
      return;
    }
    if (!analisisId) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/analysis/${analisisId}/quiz`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          respuestas: quiz.preguntas.map((p) => ({ preguntaId: p.id, respuesta: respuestas[p.id] ?? null })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ResultadoQuiz & { error?: string };
      if (!res.ok) setError(data.error ?? "No se pudo calificar el quiz.");
      else setResultado(data);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setResultado(null);
    setRespuestas(respuestasIniciales(quiz?.preguntas ?? []));
  }

  const resultadoPorId = new Map(resultado?.resultados.map((r) => [r.preguntaId, r]));

  return (
    <div className="space-y-4">
      {resultado ? (
        <ResumenResultado resultado={resultado} irALineas={irALineas} onReintentar={reiniciar} analisisId={analisisId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {quiz.preguntas.length} preguntas sobre este código. Puedes consultar las líneas antes de responder; al terminar verás la explicación de cada
          respuesta.
        </p>
      )}

      <ol className="space-y-3">
        {quiz.preguntas.map((p, i) => (
          <li key={p.id}>
            <PreguntaCard
              numero={i + 1}
              pregunta={p}
              respuesta={respuestas[p.id] ?? null}
              resultado={resultadoPorId.get(p.id)}
              onResponder={(valor) => setRespuestas((prev) => ({ ...prev, [p.id]: valor }))}
              irALineas={irALineas}
            />
          </li>
        ))}
      </ol>

      {error && <Alert variant="error">{error}</Alert>}

      {!resultado && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={enviar} disabled={enviando || sinResponder > 0}>
            {enviando ? <Spinner /> : <Send />}
            {enviando ? "Calificando…" : "Enviar respuestas"}
          </Button>
          {sinResponder > 0 && (
            <span className="text-xs text-muted-foreground">
              Te falta{sinResponder === 1 ? "" : "n"} {sinResponder} pregunta{sinResponder === 1 ? "" : "s"}.
            </span>
          )}
        </div>
      )}

      {quiz.intentos.length > 0 && !calificarLocal && (
        <div className="space-y-2 rounded-lg border p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tus intentos anteriores</h4>
          <ul className="space-y-1 text-sm">
            {quiz.intentos.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{formatearFecha(it.creadoEn)}</span>
                <span className="tabular-nums">
                  {it.porcentaje}% · {it.nivelComprension}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResumenResultado({
  resultado,
  irALineas,
  onReintentar,
  analisisId,
}: {
  resultado: ResultadoQuiz;
  irALineas: IrALineas;
  onReintentar: () => void;
  analisisId?: string;
}) {
  const aprobado = resultado.porcentaje >= UMBRAL_APROBACION;
  return (
    <Card className={aprobado ? "border-emerald-500/40" : "border-amber-500/40"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-3">
          <GraduationCap className="size-5 text-primary" />
          <span className="tabular-nums">{resultado.porcentaje}%</span>
          <Badge variant={aprobado ? "success" : "warning"}>Comprensión {resultado.nivelComprension.toLowerCase()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Acertaste {resultado.aciertos} de {resultado.total}.{" "}
          {aprobado ? "¡Entiendes este código! Revisa abajo la explicación de cada respuesta." : "Todavía hay partes que conviene repasar antes de usar este código."}
        </p>
        {resultado.repasar.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium">Te recomendamos repasar:</p>
            <ul className="flex flex-wrap gap-2">
              {resultado.repasar.map((r) => (
                <li key={`${r.lineaInicio}-${r.lineaFin}`}>
                  <BotonLineas inicio={r.lineaInicio} fin={r.lineaFin} irALineas={irALineas} texto={r.concepto ?? "Repasar"} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReintentar}>
            <RotateCcw /> Intentar de nuevo
          </Button>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="quiz">
              Generar otro quiz
            </RegenerarEtapa>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PreguntaCard({
  numero,
  pregunta: p,
  respuesta,
  resultado,
  onResponder,
  irALineas,
}: {
  numero: number;
  pregunta: PreguntaPublica;
  respuesta: RespuestaValor | null;
  resultado?: ResultadoPregunta;
  onResponder: (v: RespuestaValor) => void;
  irALineas: IrALineas;
}) {
  const bloqueado = !!resultado;
  const opciones = p.opciones ?? [];

  return (
    <Card className={cn(resultado && (resultado.correcta ? "border-emerald-500/40" : "border-destructive/40"))}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {numero}. {TIPO_PREGUNTA_INFO[p.tipo]}
            {p.concepto ? ` · ${p.concepto}` : ""}
          </p>
          <BotonLineas inicio={p.lineaInicio} fin={p.lineaFin} irALineas={irALineas} />
        </div>
        <p className="text-sm font-medium leading-relaxed">
          <TextoConCodigo texto={p.enunciado} />
        </p>

        {p.tipo === "VERDADERO_FALSO" ? (
          <div className="flex gap-2" role="radiogroup" aria-label={`Respuesta a la pregunta ${numero}`}>
            {[true, false].map((v) => (
              <OpcionBoton
                key={String(v)}
                seleccionada={respuesta === v}
                estado={estadoOpcion(resultado, v, respuesta === v)}
                disabled={bloqueado}
                onClick={() => onResponder(v)}
              >
                {v ? "Verdadero" : "Falso"}
              </OpcionBoton>
            ))}
          </div>
        ) : p.tipo === "ORDENAR" ? (
          <ListaOrdenable
            pasos={opciones}
            orden={Array.isArray(respuesta) ? respuesta : opciones.map((_, i) => i)}
            onCambiar={onResponder}
            disabled={bloqueado}
          />
        ) : (
          <div className="grid gap-2" role="radiogroup" aria-label={`Respuesta a la pregunta ${numero}`}>
            {opciones.map((texto, i) => (
              <OpcionBoton
                key={i}
                seleccionada={respuesta === i}
                estado={estadoOpcion(resultado, i, respuesta === i)}
                disabled={bloqueado}
                onClick={() => onResponder(i)}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                <TextoConCodigo texto={texto} />
              </OpcionBoton>
            ))}
          </div>
        )}

        {resultado && (
          <div className={cn("flex gap-2 rounded-md p-3 text-sm", resultado.correcta ? "bg-emerald-500/10" : "bg-destructive/10")}>
            {resultado.correcta ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
            <div className="space-y-1">
              <p className="font-medium">{resultado.correcta ? "Correcto" : `Incorrecto. Respuesta correcta: ${describirRespuesta(p, resultado.respuestaCorrecta)}`}</p>
              <p className="text-muted-foreground">
                <TextoConCodigo texto={resultado.explicacion} />
              </p>
              {!resultado.correcta && resultado.lineaInicio != null && (
                <p className="text-xs text-muted-foreground">Repasa {etiquetaLineas(resultado.lineaInicio, resultado.lineaFin)}.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type EstadoOpcion = "neutral" | "correcta" | "incorrecta";

function estadoOpcion(resultado: ResultadoPregunta | undefined, valor: RespuestaValor, elegida: boolean): EstadoOpcion {
  if (!resultado) return "neutral";
  if (resultado.respuestaCorrecta === valor) return "correcta";
  return elegida ? "incorrecta" : "neutral";
}

function OpcionBoton({
  children,
  seleccionada,
  estado,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  seleccionada: boolean;
  estado: EstadoOpcion;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        seleccionada && estado === "neutral" && "border-primary bg-primary/10",
        !seleccionada && estado === "neutral" && "hover:border-primary/50 disabled:hover:border-border",
        estado === "correcta" && "border-emerald-500 bg-emerald-500/10",
        estado === "incorrecta" && "border-destructive bg-destructive/10",
      )}
    >
      {children}
    </button>
  );
}

/** Lista reordenable con botones (accesible con teclado, funciona en móvil sin arrastrar). */
function ListaOrdenable({ pasos, orden, onCambiar, disabled }: { pasos: string[]; orden: number[]; onCambiar: (v: number[]) => void; disabled: boolean }) {
  function mover(pos: number, delta: number) {
    const destino = pos + delta;
    if (destino < 0 || destino >= orden.length) return;
    const nuevo = [...orden];
    [nuevo[pos], nuevo[destino]] = [nuevo[destino], nuevo[pos]];
    onCambiar(nuevo);
  }
  return (
    <ol className="space-y-2">
      {orden.map((indice, pos) => (
        <li key={indice} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="w-5 font-mono text-xs text-muted-foreground">{pos + 1}.</span>
          <span className="flex-1">
            <TextoConCodigo texto={pasos[indice] ?? ""} />
          </span>
          {!disabled && (
            <span className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => mover(pos, -1)} disabled={pos === 0} aria-label="Subir paso">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => mover(pos, 1)}
                disabled={pos === orden.length - 1}
                aria-label="Bajar paso"
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function describirRespuesta(p: PreguntaPublica, valor: RespuestaValor): string {
  if (typeof valor === "boolean") return valor ? "Verdadero" : "Falso";
  if (Array.isArray(valor)) return valor.map((i, n) => `${n + 1}) ${p.opciones?.[i] ?? "?"}`).join("  ");
  const letra = String.fromCharCode(65 + valor);
  return `${letra}. ${p.opciones?.[valor] ?? ""}`;
}
