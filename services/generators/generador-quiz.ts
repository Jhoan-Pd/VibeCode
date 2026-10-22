import { promptQuiz } from "@/lib/prompts";
import { prepararPreguntas, validarQuiz, type PreguntaNueva } from "@/lib/quiz";
import { QuizLLMSchema } from "@/schemas/quiz";
import { GeneradorBase, type EntradaCodigo } from "./generador-base";

/**
 * Genera el quiz de comprensión (5-10 preguntas de al menos 3 tipos) sobre el código concreto.
 * La salida se valida con Zod + reglas semánticas (índices válidos, opciones únicas, variedad de tipos)
 * y se transforma al formato guardado (las preguntas ORDENAR se barajan aquí, no en el LLM).
 */
export class GeneradorQuiz extends GeneradorBase {
  async generar(entrada: EntradaCodigo): Promise<PreguntaNueva[]> {
    const codigo = this.preparar(entrada);
    const data = await this.consultar({
      prompt: promptQuiz(codigo),
      schema: QuizLLMSchema,
      validate: validarQuiz,
      temperature: 0.4,
      maxOutputTokens: 8192,
    });
    return prepararPreguntas(data.preguntas, codigo.totalLineas);
  }
}
