import type { TipoMermaid } from "@/lib/mermaid";
import type { Bloque, Resumen, SEVERIDADES, TIPOS_HALLAZGO } from "./analysis";
import type { PreguntaPublica } from "./quiz";

/**
 * Tipos de los datos que el visor recibe (seguros para el cliente: no incluyen respuestas del quiz).
 * Los usan la página del análisis, la demo de la landing, el enlace público y la vista para imprimir.
 */

export type TipoHallazgo = (typeof TIPOS_HALLAZGO)[number];
export type Severidad = (typeof SEVERIDADES)[number];

export interface DiagramaVista {
  tipo: TipoMermaid;
  titulo: string;
  mermaid: string;
}

export interface ConceptoVista {
  nombre: string;
  explicacion: string;
  lineaInicio: number | null;
  lineaFin: number | null;
}

export interface HallazgoVista {
  tipo: TipoHallazgo;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
  sugerencia: string;
  lineaInicio: number | null;
  lineaFin: number | null;
}

export interface IntentoVista {
  id: string;
  porcentaje: number;
  nivelComprension: string;
  creadoEn: Date | string;
}

export interface QuizVista {
  id: string;
  preguntas: PreguntaPublica[];
  intentos: IntentoVista[];
}

export interface AnalisisVista {
  codigo: string;
  lenguaje: string;
  resumen: Resumen | null;
  bloques: Bloque[];
  diagramas: DiagramaVista[];
  conceptos: ConceptoVista[];
  hallazgos: HallazgoVista[];
  quiz: QuizVista | null;
}

export const ORDEN_DIAGRAMAS: TipoMermaid[] = ["FLUJO", "CLASES", "SECUENCIA"];

export const DIAGRAMA_INFO: Record<TipoMermaid, string> = {
  FLUJO: "Flujo",
  CLASES: "Clases",
  SECUENCIA: "Secuencia",
};

export const HALLAZGO_INFO: Record<TipoHallazgo, string> = {
  SEGURIDAD: "Seguridad",
  MALA_PRACTICA: "Mala práctica",
  CODIGO_MUERTO: "Código muerto",
  MANEJO_ERRORES: "Manejo de errores",
  ALUCINACION: "Posible alucinación de la IA",
};

export const SEVERIDAD_INFO: Record<Severidad, { label: string; variant: "destructive" | "warning" | "secondary" | "outline" }> = {
  CRITICA: { label: "Crítica", variant: "destructive" },
  ALTA: { label: "Alta", variant: "destructive" },
  MEDIA: { label: "Media", variant: "warning" },
  BAJA: { label: "Baja", variant: "secondary" },
};
