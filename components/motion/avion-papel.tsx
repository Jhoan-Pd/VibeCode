import { forwardRef } from "react";

/**
 * Avión de papel en SVG (dibujo propio, apunta a la derecha). Tres pliegues con tonos del azul
 * primario: ala superior, cuerpo y quilla. Decorativo: siempre con aria-hidden.
 */
export const AvionPapel = forwardRef<HTMLSpanElement, { className?: string }>(function AvionPapel({ className }, ref) {
  return (
    <span ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 48 32" width="100%" height="100%" focusable="false">
        {/* Ala superior */}
        <polygon points="47,4 1,13 17,18" fill="hsl(var(--primary))" />
        {/* Cuerpo (pliegue en sombra) */}
        <polygon points="47,4 17,18 11,25" fill="hsl(var(--primary-active))" />
        {/* Quilla */}
        <polygon points="47,4 17,18 22,30" fill="hsl(var(--primary) / 0.55)" />
        {/* Línea del pliegue central */}
        <line x1="47" y1="4" x2="17" y2="18" stroke="hsl(var(--background))" strokeOpacity="0.55" strokeWidth="0.8" />
      </svg>
    </span>
  );
});
