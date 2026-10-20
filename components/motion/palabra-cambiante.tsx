"use client";

import { useEffect, useRef } from "react";
import { AvionPapel } from "@/components/motion/avion-papel";
import { cuadro, mascaras } from "@/lib/vuelo";

const DURACION_VUELO_MS = 1800;

/**
 * Palabra del título que cambia cuando la cruza un avión de papel (como en el hero de la
 * referencia): el avión entra por arriba a la izquierda, baja hasta la palabra y la atraviesa;
 * a su paso la palabra vieja se borra y la nueva aparece detrás de él, con un leve desenfoque.
 *
 * - La trayectoria y las máscaras son funciones puras en lib/vuelo.ts.
 * - Todas las capas ocupan el ancho de la palabra más larga, así las máscaras coinciden y el
 *   título no salta al cambiar.
 * - Lectores de pantalla: leen solo la primera palabra (las capas animadas y el avión van con aria-hidden).
 * - Con «reducir movimiento» activado no hay avión y la palabra no cambia.
 */
export function PalabraCambiante({ palabras, intervaloMs = 3200 }: { palabras: string[]; intervaloMs?: number }) {
  const caja = useRef<HTMLSpanElement | null>(null);
  const avion = useRef<HTMLSpanElement | null>(null);
  const capas = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (palabras.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let actual = 0;
    let marco = 0;
    let temporizador: ReturnType<typeof setTimeout>;

    const mascara = (capa: HTMLSpanElement | null | undefined, valor: string) => {
      if (!capa) return;
      capa.style.maskImage = valor;
      capa.style.webkitMaskImage = valor;
    };

    const volar = () => {
      const siguiente = (actual + 1) % palabras.length;
      const sale = capas.current[actual];
      const entra = capas.current[siguiente];
      const el = caja.current;
      const plano = avion.current;
      if (!el || !plano || !sale || !entra) return;

      const { width: ancho, height: alto } = el.getBoundingClientRect();
      const tamano = plano.getBoundingClientRect();
      entra.style.opacity = "1";
      const inicio = performance.now();

      const paso = (ahora: number) => {
        const f = Math.min((ahora - inicio) / DURACION_VUELO_MS, 1);
        const c = cuadro(f);

        // Avión: posición en píxeles a partir de las unidades de palabra.
        const px = c.x * ancho - tamano.width / 2;
        const py = c.y * alto - tamano.height / 2;
        plano.style.opacity = c.opacidad.toFixed(3);
        plano.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${c.angulo.toFixed(1)}deg) scaleY(${c.alabeo.toFixed(3)})`;

        // Palabras: la vieja se borra detrás del avión y la nueva aparece desenfocada y se aclara.
        const m = mascaras(c.x);
        mascara(sale, m.sale);
        mascara(entra, m.entra);
        const avance = Math.min(Math.max(c.x, 0), 1);
        entra.style.filter = `blur(${((1 - avance) * 4).toFixed(2)}px)`;
        sale.style.filter = `blur(${(avance * 3).toFixed(2)}px)`;

        if (f < 1) {
          marco = requestAnimationFrame(paso);
          return;
        }
        // Estado final limpio: solo la palabra nueva, sin máscaras ni desenfoque.
        plano.style.opacity = "0";
        sale.style.opacity = "0";
        for (const capa of [sale, entra]) {
          mascara(capa, "none");
          capa.style.filter = "none";
        }
        actual = siguiente;
        temporizador = setTimeout(volar, intervaloMs);
      };
      marco = requestAnimationFrame(paso);
    };

    temporizador = setTimeout(volar, intervaloMs);
    return () => {
      clearTimeout(temporizador);
      cancelAnimationFrame(marco);
    };
  }, [palabras.length, intervaloMs]);

  return (
    <span ref={caja} className="relative inline-block">
      <span className="sr-only">{palabras[0]}</span>
      <span className="vd-morph" aria-hidden="true">
        {palabras.map((p, i) => (
          <span
            key={p}
            ref={(el) => {
              capas.current[i] = el;
            }}
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            {p}
          </span>
        ))}
      </span>
      <AvionPapel ref={avion} className="vd-avion" />
    </span>
  );
}
