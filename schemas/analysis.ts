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
  /** true = ignora la caché y vuelve a llamar al LLM (cuenta para el límite diario). */
  forzar: z.boolean().optional().default(false),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ETAPAS = ["resumen", "lineas", "diagrama", "glosario", "auditoria", "quiz"] as const;
export const EtapaSchema = z.enum(ETAPAS);
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

/** Diagramas de clases y de secuencia: el LLM decide si aplican (null si no). */
export const DiagramasEstructuralesSchema = z.object({
  clases: DiagramaSchema.nullable(),
  secuencia: DiagramaSchema.nullable(),
});
export type DiagramasEstructurales = z.infer<typeof DiagramasEstructuralesSchema>;

/* ---------- Glosario ---------- */

const lineaOpcional = z.coerce.number().int().min(1).nullable().optional();

export const ConceptoSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  explicacion: z.string().trim().min(10).max(700),
  lineaInicio: lineaOpcional,
  lineaFin: lineaOpcional,
});
export type ConceptoLLM = z.infer<typeof ConceptoSchema>;

export const GlosarioSchema = z.object({
  conceptos: z.array(ConceptoSchema).min(1).max(15),
});

/* ---------- Auditoría de "vibe code" ---------- */

export const TIPOS_HALLAZGO = ["SEGURIDAD", "MALA_PRACTICA", "CODIGO_MUERTO", "MANEJO_ERRORES", "ALUCINACION"] as const;
export const SEVERIDADES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const;

/** Acepta mayúsculas/minúsculas y espacios ("mala práctica") para tolerar variaciones del LLM. */
const enumTolerante = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s-]+/g, "_")
        : v,
    z.enum(valores),
  );

export const HallazgoSchema = z.object({
  tipo: enumTolerante(TIPOS_HALLAZGO),
  severidad: enumTolerante(SEVERIDADES),
  titulo: z.string().trim().min(3).max(140),
  descripcion: z.string().trim().min(10).max(1200),
  sugerencia: z.string().trim().min(5).max(1200),
  lineaInicio: lineaOpcional,
  lineaFin: lineaOpcional,
});
export type HallazgoLLM = z.infer<typeof HallazgoSchema>;

export const AuditoriaSchema = z.object({
  hallazgos: z.array(HallazgoSchema).max(20),
});
