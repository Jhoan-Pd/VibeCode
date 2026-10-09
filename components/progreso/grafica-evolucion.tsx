"use client";

import { useEffect, useRef, useState } from "react";

export interface PuntoEvolucion {
  fecha: string;
  porcentaje: number;
  titulo: string;
}

const ALTO = 220;
const M = { arriba: 16, derecha: 16, abajo: 28, izquierda: 48 };
const fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" });
const hora = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" });

/**
 * Evolución del puntaje del quiz (una sola serie: el título de la tarjeta la nombra, sin leyenda).
 * SVG a mano: línea de 2 px, marcadores de 8 px, rejilla tenue, una línea de referencia en el umbral
 * de aprobación y una guía vertical con tooltip al pasar el mouse (o al enfocar con el teclado).
 */
export function GraficaEvolucion({ puntos, umbral }: { puntos: PuntoEvolucion[]; umbral: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // El ancho se mide en el navegador: hasta entonces se reserva el alto (evita desbordes en móvil).
  const [medido, setMedido] = useState<number | null>(null);
  const ancho = medido ?? 0;
  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMedido(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const anchoUtil = ancho - M.izquierda - M.derecha;
  const altoUtil = ALTO - M.arriba - M.abajo;
  const x = (i: number) => M.izquierda + (puntos.length === 1 ? anchoUtil / 2 : (i / (puntos.length - 1)) * anchoUtil);
  const y = (p: number) => M.arriba + (1 - p / 100) * altoUtil;
  const ruta = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.porcentaje).toFixed(1)}`).join(" ");

  // Etiquetas del eje X: primera, última y algunas intermedias sin chocar (~90 px entre etiquetas).
  const paso = Math.max(1, Math.ceil(puntos.length / Math.max(2, Math.floor(anchoUtil / 90))));
  const etiquetasX = puntos.map((_, i) => i).filter((i) => i === 0 || i === puntos.length - 1 || (i % paso === 0 && puntos.length - 1 - i >= paso / 2));

  // Si todos los intentos son del mismo día, el eje X muestra la hora (si no, todas las etiquetas serían iguales).
  const mismoDia = puntos.length > 1 && new Set(puntos.map((p) => fechaCorta.format(new Date(p.fecha)))).size === 1;
  const etiquetaX = (f: string) => (mismoDia ? hora : fechaCorta).format(new Date(f));

  const masCercano = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || puntos.length === 0) return null;
    const px = clientX - rect.left;
    let mejor = 0;
    for (let i = 1; i < puntos.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(mejor) - px)) mejor = i;
    return mejor;
  };

  const a = activo != null ? puntos[activo] : null;

  if (medido == null) return <div ref={ref} className="w-full" style={{ height: ALTO }} aria-hidden />;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={ancho}
        height={ALTO}
        role="img"
        aria-label={`Puntaje de tus últimos ${puntos.length} quizzes, de ${puntos[0]?.porcentaje ?? 0} % a ${puntos.at(-1)?.porcentaje ?? 0} %`}
        className="block touch-none select-none"
        onPointerMove={(e) => setActivo(masCercano(e.clientX))}
        onPointerLeave={() => setActivo(null)}
      >
        {/* Rejilla tenue y eje Y */}
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={M.izquierda} x2={ancho - M.derecha} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={M.izquierda - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {v} %
            </text>
          </g>
        ))}
        {/* Umbral de aprobación */}
        <line x1={M.izquierda} x2={ancho - M.derecha} y1={y(umbral)} y2={y(umbral)} className="stroke-muted-foreground/60" strokeWidth={1} strokeDasharray="4 4" />
        <text x={ancho - M.derecha} y={y(umbral) - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
          aprobado ({umbral} %)
        </text>

        {/* Guía vertical del punto activo */}
        {a && <line x1={x(activo!)} x2={x(activo!)} y1={M.arriba} y2={ALTO - M.abajo} className="stroke-muted-foreground/50" strokeWidth={1} />}

        {/* Serie */}
        {puntos.length > 1 && <path d={ruta} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {puntos.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.porcentaje)}
            r={activo === i ? 5 : 4}
            className="fill-primary stroke-card"
            strokeWidth={2}
            tabIndex={0}
            aria-label={`${fechaCorta.format(new Date(p.fecha))}: ${p.porcentaje} % en ${p.titulo}`}
            onFocus={() => setActivo(i)}
            onBlur={() => setActivo(null)}
          />
        ))}

        {/* Eje X */}
        {etiquetasX.map((i) => (
          <text key={i} x={x(i)} y={ALTO - 8} textAnchor={i === 0 && puntos.length > 1 ? "start" : i === puntos.length - 1 && puntos.length > 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
            {etiquetaX(puntos[i].fecha)}
          </text>
        ))}
      </svg>

      {a && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-md border bg-card px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(Math.max(x(activo!), 110), ancho - 110), top: y(a.porcentaje) - 10 }}
          role="status"
        >
          <p className="font-semibold tabular-nums text-foreground">{a.porcentaje} %</p>
          <p className="line-clamp-2 text-muted-foreground">{a.titulo}</p>
          <p className="text-muted-foreground">
            {fechaCorta.format(new Date(a.fecha))} · {hora.format(new Date(a.fecha))}
          </p>
        </div>
      )}
    </div>
  );
}
