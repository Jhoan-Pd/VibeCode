import { describe, expect, it } from "vitest";
import {
  conteoPorLenguaje,
  dominioPorConcepto,
  estadoDe,
  normalizarConcepto,
  promedioMejoresIntentos,
  rachaDias,
  tendencia,
  type IntentoResumen,
  type RespuestaConcepto,
} from "@/lib/progreso";

const dia = (n: number) => new Date(Date.UTC(2026, 9, n, 15));
const resp = (concepto: string | null, correcta: boolean, n: number, extra: Partial<RespuestaConcepto> = {}): RespuestaConcepto => ({
  concepto,
  correcta,
  fecha: dia(n),
  analisisId: "a1",
  lineaInicio: n,
  lineaFin: n,
  ...extra,
});

describe("normalizarConcepto", () => {
  it("ignora mayúsculas, tildes y espacios repetidos", () => {
    expect(normalizarConcepto("  Recursión  ")).toBe("recursion");
    expect(normalizarConcepto("Closures   en JS")).toBe("closures en js");
  });
});

describe("estadoDe", () => {
  it("usa los umbrales 80 y 50", () => {
    expect(estadoDe(80)).toBe("dominado");
    expect(estadoDe(79.9)).toBe("en_progreso");
    expect(estadoDe(50)).toBe("en_progreso");
    expect(estadoDe(49)).toBe("reforzar");
  });
});

describe("dominioPorConcepto", () => {
  it("agrupa variantes del mismo concepto y conserva el primer nombre visto", () => {
    const r = dominioPorConcepto([resp("Promesas", true, 1), resp("promesas", true, 2)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ nombre: "Promesas", aciertos: 2, total: 2, dominio: 100, estado: "dominado", pocasRespuestas: false });
  });

  it("ignora respuestas sin concepto", () => {
    expect(dominioPorConcepto([resp(null, true, 1), resp("   ", false, 2)])).toEqual([]);
  });

  it("las respuestas recientes pesan más que las antiguas", () => {
    const mejora = dominioPorConcepto([resp("bucles", false, 1), resp("bucles", false, 2), resp("bucles", true, 3)])[0];
    const empeora = dominioPorConcepto([resp("bucles", true, 1), resp("bucles", true, 2), resp("bucles", false, 3)])[0];
    // Mismo número de aciertos (1 vs 2) no importa: lo que importa es la tendencia.
    expect(mejora.dominio).toBeGreaterThan(100 / 3);
    expect(empeora.dominio).toBeLessThan(200 / 3);
  });

  it("marca pocas respuestas y apunta a la última pregunta fallada para repasar", () => {
    const [c] = dominioPorConcepto([resp("map", false, 4, { analisisId: "x", lineaInicio: 7, lineaFin: 9 })]);
    expect(c.pocasRespuestas).toBe(true);
    expect(c.repaso).toEqual({ analisisId: "x", lineaInicio: 7, lineaFin: 9 });

    const [d] = dominioPorConcepto([
      resp("map", false, 1, { analisisId: "viejo" }),
      resp("map", false, 2, { analisisId: "reciente" }),
      resp("map", true, 3, { analisisId: "acierto" }),
    ]);
    expect(d.repaso?.analisisId).toBe("reciente");
  });

  it("ordena del peor dominio al mejor", () => {
    const r = dominioPorConcepto([resp("a", true, 1), resp("b", false, 1), resp("c", true, 1), resp("c", false, 2)]);
    expect(r.map((c) => c.nombre)).toEqual(["b", "c", "a"]);
  });
});

describe("promedioMejoresIntentos", () => {
  const intento = (quizId: string, porcentaje: number, n = 1): IntentoResumen => ({ quizId, analisisId: "a", titulo: "t", porcentaje, fecha: dia(n) });

  it("toma el mejor intento de cada quiz", () => {
    expect(promedioMejoresIntentos([intento("q1", 40), intento("q1", 80), intento("q2", 60)])).toBe(70);
  });

  it("devuelve null sin intentos", () => {
    expect(promedioMejoresIntentos([])).toBeNull();
  });

  it("tendencia compara la mitad reciente con la antigua", () => {
    expect(tendencia([intento("q", 40, 1), intento("q", 60, 2), intento("q", 80, 3)])).toBeNull();
    expect(tendencia([intento("q", 40, 1), intento("q", 50, 2), intento("q", 70, 3), intento("q", 80, 4)])).toBe(30);
    expect(tendencia([intento("q", 90, 4), intento("q", 90, 3), intento("q", 50, 2), intento("q", 50, 1)])).toBe(40);
  });
});

describe("conteoPorLenguaje y rachaDias", () => {
  it("cuenta y ordena lenguajes", () => {
    expect(conteoPorLenguaje(["python", "javascript", "python"])).toEqual([
      { lenguaje: "python", cantidad: 2 },
      { lenguaje: "javascript", cantidad: 1 },
    ]);
  });

  it("cuenta días consecutivos aunque hoy aún no haya actividad", () => {
    expect(rachaDias(["2026-10-08", "2026-10-07", "2026-10-06", "2026-10-03"], "2026-10-08")).toBe(3);
    expect(rachaDias(["2026-10-07", "2026-10-06"], "2026-10-08")).toBe(2);
    expect(rachaDias(["2026-10-05"], "2026-10-08")).toBe(0);
    expect(rachaDias(["2026-03-01", "2026-02-28"], "2026-03-01")).toBe(2);
  });
});
