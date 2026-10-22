"use client";

import { Send } from "lucide-react";
import { RegenerarEtapa } from "@/components/regenerar-etapa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/misc";
import { textoFaltan, type Respuestas } from "@/lib/quiz-cliente";
import type { ResultadoQuiz } from "@/schemas/quiz";
import type { QuizVista } from "@/schemas/vista";
import type { IrALineas } from "./boton-lineas";
import { PreguntaQuiz } from "./quiz/pregunta-quiz";
import { IntentosAnteriores, ResumenQuiz } from "./quiz/resumen-quiz";
import { useQuiz, type Calificador } from "./quiz/use-quiz";

export interface QuizPanelProps {
  quiz: QuizVista | null;
  irALineas: IrALineas;
  /** Análisis propio: califica en el servidor y permite generar otro quiz. */
  analisisId?: string;
  /** Demo de la landing: califica en el navegador con las respuestas de ejemplo. */
  calificarLocal?: (respuestas: Respuestas) => ResultadoQuiz;
}

function calificadorDe({ analisisId, calificarLocal }: Pick<QuizPanelProps, "analisisId" | "calificarLocal">): Calificador {
  if (calificarLocal) return { tipo: "local", calificar: calificarLocal };
  if (analisisId) return { tipo: "servidor", analisisId };
  return { tipo: "ninguno" };
}

/** Contenedor del quiz: el estado vive en useQuiz y cada parte visual en su propio componente. */
export function QuizPanel({ quiz, irALineas, analisisId, calificarLocal }: QuizPanelProps) {
  const q = useQuiz(quiz, calificadorDe({ analisisId, calificarLocal }));

  if (!quiz || quiz.preguntas.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Todavía no hay quiz para este código.</p>
          {analisisId && (
            <RegenerarEtapa analisisId={analisisId} etapa="quiz">
              Generar quiz
            </RegenerarEtapa>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {q.resultado ? (
        <ResumenQuiz resultado={q.resultado} irALineas={irALineas} onReintentar={q.reiniciar} analisisId={analisisId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {quiz.preguntas.length} preguntas sobre este código. Puedes consultar las líneas antes de responder; al terminar verás la explicación de cada
          respuesta.
        </p>
      )}

      <ol className="space-y-3">
        {quiz.preguntas.map((p, i) => (
          <li key={p.id}>
            <PreguntaQuiz
              numero={i + 1}
              pregunta={p}
              respuesta={q.respuestas[p.id] ?? null}
              resultado={q.resultadoPorId.get(p.id)}
              onResponder={(valor) => q.responder(p.id, valor)}
              irALineas={irALineas}
            />
          </li>
        ))}
      </ol>

      {q.error && <Alert variant="error">{q.error}</Alert>}

      {!q.resultado && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={q.enviar} disabled={q.enviando || q.sinResponder > 0}>
            {q.enviando ? <Spinner /> : <Send />}
            {q.enviando ? "Calificando…" : "Enviar respuestas"}
          </Button>
          {q.sinResponder > 0 && <span className="text-xs text-muted-foreground">{textoFaltan(q.sinResponder)}</span>}
        </div>
      )}

      {quiz.intentos.length > 0 && !calificarLocal && <IntentosAnteriores intentos={quiz.intentos} />}
    </div>
  );
}
