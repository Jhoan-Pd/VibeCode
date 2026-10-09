import "server-only";
import { ZONA_HORARIA } from "@/lib/config";
import { db } from "@/lib/db";
import { fechaClave } from "@/lib/limites";
import {
  conteoPorLenguaje,
  dominioPorConcepto,
  promedioMejoresIntentos,
  rachaDias,
  tendencia,
  type ConceptoProgreso,
  type IntentoResumen,
} from "@/lib/progreso";

export interface Progreso {
  totales: { analisis: number; completos: number; intentos: number; quizzesRespondidos: number; mensajesChat: number };
  promedio: number | null;
  tendencia: number | null;
  racha: number;
  conceptos: ConceptoProgreso[];
  lenguajes: { lenguaje: string; cantidad: number }[];
  /** Intentos en orden cronológico para la gráfica de evolución. */
  evolucion: { fecha: string; porcentaje: number; titulo: string; analisisId: string }[];
  /** Títulos de los análisis que aparecen en los conceptos (para los enlaces de repaso). */
  titulos: Record<string, string>;
}

/** Ventana de datos: suficiente para un curso y acotada para que la página sea rápida. */
const MAX_INTENTOS = 200;
const MAX_RESPUESTAS = 2000;

export async function obtenerProgreso(usuarioId: string): Promise<Progreso> {
  const [analisis, intentos, respuestas, mensajesChat] = await Promise.all([
    db.analisis.findMany({
      where: { usuarioId },
      select: { id: true, titulo: true, lenguaje: true, estado: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
    }),
    db.intentoQuiz.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: "desc" },
      take: MAX_INTENTOS,
      select: { quizId: true, porcentaje: true, creadoEn: true, quiz: { select: { analisisId: true, analisis: { select: { titulo: true } } } } },
    }),
    db.respuestaUsuario.findMany({
      where: { intento: { usuarioId } },
      orderBy: { intento: { creadoEn: "desc" } },
      take: MAX_RESPUESTAS,
      select: {
        correcta: true,
        intento: { select: { creadoEn: true } },
        pregunta: { select: { concepto: true, lineaInicio: true, lineaFin: true, quiz: { select: { analisisId: true } } } },
      },
    }),
    db.mensajeChat.count({ where: { usuarioId, rol: "USUARIO" } }),
  ]);

  const resumenIntentos: IntentoResumen[] = intentos.map((i) => ({
    quizId: i.quizId,
    analisisId: i.quiz.analisisId,
    titulo: i.quiz.analisis.titulo,
    porcentaje: i.porcentaje,
    fecha: i.creadoEn,
  }));

  const conceptos = dominioPorConcepto(
    respuestas.map((r) => ({
      concepto: r.pregunta.concepto,
      correcta: r.correcta,
      fecha: r.intento.creadoEn,
      analisisId: r.pregunta.quiz.analisisId,
      lineaInicio: r.pregunta.lineaInicio,
      lineaFin: r.pregunta.lineaFin,
    })),
  );

  const dias = [...analisis.map((a) => a.creadoEn), ...intentos.map((i) => i.creadoEn)].map((f) => fechaClave(f, ZONA_HORARIA));
  const titulos = Object.fromEntries(analisis.map((a) => [a.id, a.titulo]));

  return {
    totales: {
      analisis: analisis.length,
      completos: analisis.filter((a) => a.estado === "COMPLETO").length,
      intentos: intentos.length,
      quizzesRespondidos: new Set(intentos.map((i) => i.quizId)).size,
      mensajesChat,
    },
    promedio: promedioMejoresIntentos(resumenIntentos),
    tendencia: tendencia(resumenIntentos),
    racha: rachaDias(dias, fechaClave(new Date(), ZONA_HORARIA)),
    conceptos,
    lenguajes: conteoPorLenguaje(analisis.map((a) => a.lenguaje)),
    evolucion: [...resumenIntentos]
      .reverse()
      .slice(-30)
      .map((i) => ({ fecha: i.fecha.toISOString(), porcentaje: i.porcentaje, titulo: i.titulo, analisisId: i.analisisId })),
    titulos,
  };
}
