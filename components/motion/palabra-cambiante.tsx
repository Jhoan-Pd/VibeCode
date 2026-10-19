"use client";

import { useEffect, useId, useState } from "react";

/**
 * Palabra que alterna entre varias opciones con un fundido "líquido": las dos capas se cruzan con
 * desenfoque y un filtro SVG de umbral (feColorMatrix) junta los bordes mientras dura el cambio.
 * - Lectores de pantalla: solo leen la primera palabra (las capas animadas van con aria-hidden).
 * - Con «reducir movimiento» activado, la palabra no cambia.
 */
export function PalabraCambiante({ palabras, intervaloMs = 2800 }: { palabras: string[]; intervaloMs?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [actual, setActual] = useState(0);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    if (palabras.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let finCambio: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(() => {
      setCambiando(true);
      setActual((i) => (i + 1) % palabras.length);
      finCambio = setTimeout(() => setCambiando(false), 850);
    }, intervaloMs);
    return () => {
      clearInterval(t);
      if (finCambio) clearTimeout(finCambio);
    };
  }, [palabras.length, intervaloMs]);

  return (
    <span className="relative inline-block">
      <span className="sr-only">{palabras[0]}</span>
      <span
        className="vd-morph"
        aria-hidden="true"
        data-morphing={cambiando}
        style={{ ["--vd-morph-filter" as string]: `url(#umbral-${id})` }}
      >
        {palabras.map((p, i) => (
          <span key={p} style={{ opacity: i === actual ? 1 : 0, filter: i === actual ? "blur(0px)" : "blur(12px)" }}>
            {p}
          </span>
        ))}
      </span>
      <svg className="absolute size-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`umbral-${id}`} x="-30%" y="-100%" width="160%" height="320%">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
    </span>
  );
}
