/**
 * Trayectoria del avión de papel del título (funciones puras, probadas con Vitest).
 *
 * Las coordenadas están en "unidades de palabra": x = 0 es el borde izquierdo de la palabra y
 * x = 1 el derecho; y = 0 es su borde superior e y = 1 el inferior. El avión entra por arriba a la
 * izquierda, baja hasta la palabra, la cruza de izquierda a derecha (borrándola a su paso) y sale
 * subiendo por la derecha.
 */

export interface Punto {
  x: number;
  y: number;
}

/** Puntos de control de la curva de Bézier cúbica del vuelo. */
export const RUTA: [Punto, Punto, Punto, Punto] = [
  { x: -0.9, y: -0.6 },
  { x: -0.15, y: 1.25 },
  { x: 0.9, y: 0.9 },
  { x: 1.9, y: -0.25 },
];

export function bezier([p0, p1, p2, p3]: [Punto, Punto, Punto, Punto], t: number): Punto {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

/** Derivada de la curva: la dirección en la que apunta el avión. */
export function tangente([p0, p1, p2, p3]: [Punto, Punto, Punto, Punto], t: number): Punto {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

/** Entra rápido, frena al cruzar la palabra y acelera al salir (seno, simétrica). */
export function suavizado(f: number): number {
  const c = Math.min(Math.max(f, 0), 1);
  return 0.5 - Math.cos(Math.PI * c) / 2;
}

export interface CuadroVuelo {
  /** Posición del centro del avión, en unidades de palabra. */
  x: number;
  y: number;
  /** Ángulo en grados (0 = hacia la derecha). */
  angulo: number;
  /** Escala vertical: simula que el avión se inclina (alabeo) al girar. */
  alabeo: number;
  opacidad: number;
}

/** Estado del avión en la fracción `f` (0–1) del vuelo. */
export function cuadro(f: number, ruta = RUTA): CuadroVuelo {
  const t = suavizado(f);
  const p = bezier(ruta, t);
  const d = tangente(ruta, t);
  const entrada = Math.min(f / 0.12, 1);
  const salida = Math.min((1 - f) / 0.15, 1);
  return {
    x: p.x,
    y: p.y,
    angulo: (Math.atan2(d.y, d.x) * 180) / Math.PI,
    alabeo: 0.7 + 0.3 * Math.abs(Math.cos(Math.PI * f)),
    opacidad: Math.max(0, Math.min(entrada, salida)),
  };
}

/**
 * Máscaras CSS de las dos palabras según la posición `x` del avión: la palabra que sale se borra
 * justo detrás del avión y la que entra aparece detrás de él, con un borde suave.
 */
export function mascaras(x: number): { sale: string; entra: string } {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return {
    sale: `linear-gradient(90deg, transparent ${pct(x - 0.06)}, #000 ${pct(x + 0.1)})`,
    entra: `linear-gradient(90deg, #000 ${pct(x - 0.2)}, transparent ${pct(x - 0.02)})`,
  };
}
