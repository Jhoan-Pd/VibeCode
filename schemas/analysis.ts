import { z } from "zod";
import { MAX_CODE_CHARS } from "@/lib/config";
import { LANGUAGE_IDS } from "@/lib/language";
import { NivelSchema } from "./common";

/* ---------- Entrada del usuario ---------- */

export const AnalyzeRequestSchema = z.object({
  codigo: z
    .string()
    .min(1, "Pega o sube algo de código")
    .max(MAX_CODE_CHARS, `El código supera el máximo de ${MAX_CODE_CHARS} caracteres`)
    .refine((c) => !c.includes("\u0000"), "El archivo parece binario, no es código de texto")
    .refine((c) => c.trim().length >= 3, "El código es demasiado corto"),
  lenguaje: z.enum([...LANGUAGE_IDS, "auto"]).default("auto"),
  nivel: NivelSchema,
  titulo: z.string().trim().max(120).optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const EtapaSchema = z.enum(["resumen", "lineas", "diagrama"]);
export type Etapa = z.infer<typeof EtapaSchema>;

export const RegenerarRequestSchema = z.object({ etapa: EtapaSchema });

/* ---------- Salida del LLM (se valida con Zod; si falla, se reintenta) ---------- */

const listaCorta = (max: number) => z.array(z.string().trim().min(1).max(300)).max(max);

export const ResumenSchema = z.object({
  proposito: z.string().trim().min(10).max(1200),
  entradas: listaCorta(12),
  salidas: listaCorta(12),
  dependencias: listaCorta(20),
});
export type Resumen = z.infer<typeof ResumenSchema>;

export const BloqueSchema = z
  .object({
    lineaInicio: z.coerce.number().int().min(1),
    lineaFin: z.coerce.number().int().min(1),
    titulo: z.string().trim().min(2).max(140),
    explicacion: z.string().trim().min(10).max(1800),
  })
  .refine((b) => b.lineaFin >= b.lineaInicio, { message: "lineaFin debe ser mayor o igual que lineaInicio" });
export type Bloque = z.infer<typeof BloqueSchema>;

export const BloquesSchema = z.object({
  bloques: z.array(BloqueSchema).min(1).max(80),
});

export const DiagramaSchema = z.object({
  titulo: z.string().trim().min(2).max(140),
  mermaid: z.string().min(10).max(10_000),
});
export type DiagramaLLM = z.infer<typeof DiagramaSchema>;
