"use client";

import { useState } from "react";
import { pedirJson } from "@/lib/client/api";
import { contarSinResponder, respuestasIniciales, type Respuestas } from "@/lib/quiz-cliente";
import type { RespuestaValor, ResultadoQuiz } from "@/schemas/quiz";
import type { QuizVista } from "@/schemas/vista";

/** Cómo se califica: en el servidor (análisis propio) o en el navegador (demo de la landing). */
export type Calificador = { tipo: "servidor"; analisisId: string } | { tipo: "local"; calificar: (r: Respuestas) => ResultadoQuiz } | { tipo: "ninguno" };

/**
 * Estado del quiz (respuestas, resultado, envío y error) separado de la presentación.
 * El componente solo llama a `responder`, `enviar` y `reiniciar`.
 */
export function useQuiz(quiz: QuizVista | null, calificador: Calificador) {
  const preguntas = quiz?.preguntas ?? [];
  const [respuestas, setRespuestas] = useState<Respuestas>(() => respuestasIniciales(preguntas));
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function responder(preguntaId: string, valor: RespuestaValor) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
  }

  async function enviar() {
    if (!quiz) return;
    setError(null);
    if (calificador.tipo === "local") {
      setResultado(calificador.calificar(respuestas));
      return;
    }
    if (calificador.tipo === "ninguno") return;
    setEnviando(true);
    const r = await pedirJson<ResultadoQuiz>(`/api/analysis/${calificador.analisisId}/quiz`, {
      cuerpo: { quizId: quiz.id, respuestas: preguntas.map((p) => ({ preguntaId: p.id, respuesta: respuestas[p.id] ?? null })) },
      errorPorDefecto: "No se pudo calificar el quiz.",
    });
    setEnviando(false);
    if (r.ok) setResultado(r.datos);
    else setError(r.error);
  }

  function reiniciar() {
    setResultado(null);
    setRespuestas(respuestasIniciales(preguntas));
  }

  return {
    respuestas,
    resultado,
    resultadoPorId: new Map(resultado?.resultados.map((r) => [r.preguntaId, r])),
    sinResponder: contarSinResponder(preguntas, respuestas),
    enviando,
    error,
    responder,
    enviar,
    reiniciar,
  };
}
