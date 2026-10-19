"use client";

import { useEffect, useRef } from "react";

const DURACION_CAMBIO_MS = 1000;

/**
 * Palabra que alterna entre varias opciones con un fundido desenfocado: la palabra que sale se
 * desenfoca (hasta 12 px) y se desvanece mientras la que entra hace lo contrario.
 * La opacidad sigue f^0.4, así a mitad del cambio las dos capas siguen visibles (~76 %) y la
 * palabra nunca "desaparece". (Se probó el filtro SVG de umbral de la referencia, pero con una
 * serif de trazo fino rompía las letras; por eso no se usa.)
 *
 * - Lectores de pantalla: leen solo la primera palabra (las capas animadas van con aria-hidden).
 * - Con «reducir movimiento» activado, la palabra no cambia.
 */
export function PalabraCambiante({ palabras, intervaloMs = 3000 }: { palabras: string[]; intervaloMs?: number }) {
  const capas = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (palabras.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let actual = 0;
    let marco = 0;
    let temporizador: ReturnType<typeof setTimeout>;

    const pintar = (capa: HTMLSpanElement | null | undefined, f: number) => {
      if (!capa) return;
      const fraccion = Math.min(Math.max(f, 0), 1);
      capa.style.opacity = `${Math.pow(fraccion, 0.4)}`;
      capa.style.filter = `blur(${((1 - fraccion) * 12).toFixed(2)}px)`;
    };

    const cambiar = () => {
      const siguiente = (actual + 1) % palabras.length;
      const sale = capas.current[actual];
      const entra = capas.current[siguiente];
      const inicio = performance.now();

      const paso = (ahora: number) => {
        const f = Math.min((ahora - inicio) / DURACION_CAMBIO_MS, 1);
        pintar(entra, f);
        pintar(sale, 1 - f);
        if (f < 1) {
          marco = requestAnimationFrame(paso);
          return;
        }
        actual = siguiente;
        temporizador = setTimeout(cambiar, intervaloMs);
      };
      marco = requestAnimationFrame(paso);
    };

    temporizador = setTimeout(cambiar, intervaloMs);
    return () => {
      clearTimeout(temporizador);
      cancelAnimationFrame(marco);
    };
  }, [palabras.length, intervaloMs]);

  return (
    <span className="inline-block">
      <span className="sr-only">{palabras[0]}</span>
      <span className="vd-morph" aria-hidden="true">
        {palabras.map((p, i) => (
          <span
            key={p}
            ref={(el) => {
              capas.current[i] = el;
            }}
            style={{ opacity: i === 0 ? 1 : 0, filter: i === 0 ? "blur(0px)" : "blur(12px)" }}
          >
            {p}
          </span>
        ))}
      </span>
    </span>
  );
}
