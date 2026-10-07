import { z } from "zod";

export const NIVELES = ["PRINCIPIANTE", "INTERMEDIO", "AVANZADO"] as const;
export const NivelSchema = z.enum(NIVELES);
export type NivelUsuario = z.infer<typeof NivelSchema>;

export const NIVEL_INFO: Record<NivelUsuario, { label: string; descripcion: string }> = {
  PRINCIPIANTE: {
    label: "Principiante",
    descripcion: "Explicaciones paso a paso, con analogías y sin dar nada por sabido.",
  },
  INTERMEDIO: {
    label: "Intermedio",
    descripcion: "Directo al punto: explica lo no obvio y nombra los patrones.",
  },
  AVANZADO: {
    label: "Avanzado",
    descripcion: "Decisiones de diseño, complejidad, casos límite y trade-offs.",
  },
};

export type EstadoAnalisisUI = "PENDIENTE" | "PROCESANDO" | "COMPLETO" | "ERROR";
