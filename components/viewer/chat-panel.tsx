"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Send, Sparkles, Trash2, X } from "lucide-react";
import { TextoChat } from "@/components/texto-chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { MAX_MENSAJE_CHAT, type MensajeChatVista } from "@/schemas/chat";
import { BotonLineas, etiquetaLineas, type IrALineas } from "./boton-lineas";

export type Seleccion = { inicio: number; fin: number } | null;

const SUGERENCIAS = ["¿Por qué se hace así y no de otra forma?", "¿Qué pasaría si elimino estas líneas?", "Explícamelo con un ejemplo concreto"];

export interface ChatPanelProps {
  /** Sin analisisId (demo) se muestra una invitación a crear cuenta. */
  analisisId?: string;
  mensajesIniciales: MensajeChatVista[];
  seleccion: Seleccion;
  limpiarSeleccion: () => void;
  irALineas: IrALineas;
}

/** Chat contextual: preguntas de seguimiento sobre la línea o bloque seleccionado en el editor. */
export function ChatPanel({ analisisId, mensajesIniciales, seleccion, limpiarSeleccion, irALineas }: ChatPanelProps) {
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [mensajes, enviando]);

  if (!analisisId) {
    return (
      <Card className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <MessageSquareText className="size-8 text-primary" />
        <p className="font-medium">Pregúntale a la IA sobre cualquier línea</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Selecciona líneas en el editor y haz preguntas de seguimiento sobre ese fragmento. Disponible con una cuenta gratuita.
        </p>
        <Button asChild size="sm">
          <Link href="/register">Crear cuenta</Link>
        </Button>
      </Card>
    );
  }

  async function enviar(pregunta: string) {
    const mensaje = pregunta.trim();
    if (mensaje.length < 2 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${analisisId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensaje, lineaInicio: seleccion?.inicio ?? null, lineaFin: seleccion?.fin ?? null }),
      });
      const data = (await res.json().catch(() => ({}))) as { mensajes?: MensajeChatVista[]; error?: string };
      if (!res.ok || !data.mensajes) {
        setError(data.error ?? "No se pudo obtener respuesta.");
        return;
      }
      setMensajes((prev) => [...prev, ...data.mensajes!]);
      setTexto("");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrar() {
    const res = await fetch(`/api/analysis/${analisisId}/chat`, { method: "DELETE" });
    if (res.ok) setMensajes([]);
  }

  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareText className="size-4 text-primary" /> Chat sobre este código
        </p>
        {mensajes.length > 0 && (
          <Button variant="ghost" size="sm" onClick={borrar} aria-label="Borrar conversación">
            <Trash2 /> Borrar
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {mensajes.length === 0 && !enviando && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Selecciona líneas en el editor (o usa «Preguntar» en una explicación) y escribe tu duda. También puedes preguntar sobre el código en general.</p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void enviar(s)}
                  className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={cn("flex", m.rol === "USUARIO" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[90%] space-y-2 rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.rol === "USUARIO" ? "bg-primary/15" : "border bg-background/60",
              )}
            >
              {m.rol === "USUARIO" && m.lineaInicio != null && <BotonLineas inicio={m.lineaInicio} fin={m.lineaFin} irALineas={irALineas} />}
              {m.rol === "USUARIO" ? <p className="whitespace-pre-wrap">{m.contenido}</p> : <TextoChat texto={m.contenido} />}
            </div>
          </div>
        ))}
        {enviando && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Pensando…
          </p>
        )}
        <div ref={finRef} />
      </div>

      {error && (
        <Alert variant="error" className="mx-4 mb-2">
          {error}
        </Alert>
      )}

      <form
        className="space-y-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(texto);
        }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          {seleccion ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
              Sobre {etiquetaLineas(seleccion.inicio, seleccion.fin)}
              <button type="button" onClick={limpiarSeleccion} aria-label="Quitar selección" className="hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ) : (
            <span>Sin selección: pregunta sobre todo el código</span>
          )}
        </div>
        <div className="flex gap-2">
          <label htmlFor="chat-mensaje" className="sr-only">
            Tu pregunta
          </label>
          <textarea
            id="chat-mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(texto);
              }
            }}
            maxLength={MAX_MENSAJE_CHAT}
            rows={2}
            placeholder="¿Qué hace exactamente esta parte?"
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={enviando || texto.trim().length < 2} aria-label="Enviar pregunta">
            {enviando ? <Spinner /> : <Send />}
          </Button>
        </div>
      </form>
    </Card>
  );
}
