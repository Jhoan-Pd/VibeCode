import { z } from "zod";

export const MAX_MENSAJE_CHAT = 1000;

export const ChatRequestSchema = z
  .object({
    mensaje: z.string().trim().min(2, "Escribe una pregunta").max(MAX_MENSAJE_CHAT, `Máximo ${MAX_MENSAJE_CHAT} caracteres`),
    lineaInicio: z.number().int().min(1).nullable().optional(),
    lineaFin: z.number().int().min(1).nullable().optional(),
  })
  .refine((d) => d.lineaInicio == null || d.lineaFin == null || d.lineaFin >= d.lineaInicio, { message: "Rango de líneas inválido" });
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface MensajeChatVista {
  id: string;
  rol: "USUARIO" | "ASISTENTE";
  contenido: string;
  lineaInicio: number | null;
  lineaFin: number | null;
  creadoEn: string;
}
