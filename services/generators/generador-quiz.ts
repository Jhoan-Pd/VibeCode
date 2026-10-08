import { dividirLineas, numerarLineas } from "@/lib/chunking";
import { generateJson } from "@/lib/llm/json";
import { SISTEMA_BASE, promptQuiz } from "@/lib/prompts";
import { prepararPreguntas, validarQuiz, type PreguntaNueva } from "@/lib/quiz";
import { QuizLLMSchema } from "@/schemas/quiz";
import { GeneradorBase } from "./generador-base";
import type { EntradaCodigo } from "./generador-explicacion";

/**
 * Genera el quiz de comprensión (5-10 preguntas de al menos 3 tipos) sobre el código concreto.
 * La salida se valida con Zod + reglas semánticas (índices válidos, opciones únicas, variedad de tipos)
 * y se transforma al formato guardado (las preguntas ORDENAR se barajan aquí, no en el LLM).
 */
export class GeneradorQuiz extends GeneradorBase {
  async generar(entrada: EntradaCodigo): Promise<PreguntaNueva[]> {
    const lineas = dividirLineas(entrada.codigo);
    const { data } = await generateJson({
      provider: this.provider,
      system: SISTEMA_BASE,
      prompt: promptQuiz({
        codigoNumerado: numerarLineas(lineas),
        lenguaje: entrada.lenguaje,
        nivel: entrada.nivel,
        totalLineas: lineas.length,
      }),
      schema: QuizLLMSchema,
      validate: validarQuiz,
      temperature: 0.4,
      maxOutputTokens: 8192,
    });
    return prepararPreguntas(data.preguntas, lineas.length);
  }
}
