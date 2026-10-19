"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Hace aparecer al entrar en pantalla todo elemento con el atributo `data-revelar`
 * (el estilo vive en globals.css). Se monta una vez en el layout, vuelve a buscar elementos
 * en cada cambio de ruta y vigila los que se agregan después. Si el navegador no tiene
 * IntersectionObserver, los muestra todos de inmediato.
 */
export function ObservadorRevelar() {
  const ruta = usePathname();

  useEffect(() => {
    const sinObservador = !("IntersectionObserver" in window);
    const observador = sinObservador
      ? null
      : new IntersectionObserver(
          (entradas) => {
            for (const entrada of entradas) {
              if (!entrada.isIntersecting) continue;
              entrada.target.classList.add("vd-visible");
              observador?.unobserve(entrada.target);
            }
          },
          { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
        );

    const vigilar = (raiz: ParentNode) => {
      raiz.querySelectorAll<HTMLElement>("[data-revelar]:not(.vd-visible)").forEach((el) => {
        if (observador) observador.observe(el);
        else el.classList.add("vd-visible");
      });
    };
    vigilar(document);

    // Elementos que aparecen después (contenido cargado en el cliente) también se vigilan, para que nunca queden ocultos.
    const mutaciones = new MutationObserver((cambios) => {
      for (const c of cambios) c.addedNodes.forEach((n) => n instanceof HTMLElement && (n.matches("[data-revelar]") ? vigilar(n.parentElement ?? document) : vigilar(n)));
    });
    mutaciones.observe(document.body, { childList: true, subtree: true });

    return () => {
      observador?.disconnect();
      mutaciones.disconnect();
    };
  }, [ruta]);

  return null;
}

/** Retraso escalonado para listas: el elemento `i` entra 70 ms después del anterior (máximo 6 pasos). */
export function retraso(i: number, pasoMs = 70): React.CSSProperties {
  return { ["--vd-delay" as string]: `${Math.min(i, 6) * pasoMs}ms` };
}
