"use client";

import { ArrowDown, ArrowUp, CheckCircle2, XCircle } from "lucide-react";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { describirRespuesta, estadoOpcion, letraOpcion, moverPaso, type EstadoOpcion } from "@/lib/quiz-cliente";
import { cn } from "@/lib/utils";
import { TIPO_PREGUNTA_INFO, type PreguntaPublica, type RespuestaValor, type ResultadoPregunta } from "@/schemas/quiz";
import { BotonLineas, etiquetaLineas, type IrALineas } from "../boton-lineas";

/** Una pregunta del quiz: enunciado, controles según el tipo y, ya calificada, la explicación. */
export function PreguntaQuiz({
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
                <span className="mr-2 font-mono text-xs text-muted-foreground">{letraOpcion(i)}.</span>
                <TextoConCodigo texto={texto} />
              </OpcionBoton>
            ))}
          </div>
        )}

        {resultado && (
          <div className={cn("flex gap-2 rounded-md p-3 text-sm", resultado.correcta ? "bg-emerald-500/10" : "bg-destructive/10")}>
            {resultado.correcta ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
            <div className="space-y-1">
              <p className="font-medium">
                {resultado.correcta ? "Correcto" : <TextoConCodigo texto={`Incorrecto. Respuesta correcta: ${describirRespuesta(p, resultado.respuestaCorrecta)}`} />}
              </p>
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
  const mover = (pos: number, delta: -1 | 1) => onCambiar([...moverPaso(orden, pos, delta)]);
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
