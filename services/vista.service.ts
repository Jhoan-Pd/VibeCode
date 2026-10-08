import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ResumenSchema } from "@/schemas/analysis";
import { ORDEN_DIAGRAMAS, type AnalisisVista } from "@/schemas/vista";
import { ordenarHallazgos } from "./generators/auditor-codigo";
import { obtenerQuizActual } from "./quiz.service";

/**
 * Carga un análisis con todo lo que necesita el visor. `where` decide el acceso:
 *  - página privada: { id, usuarioId } (solo el dueño),
 *  - enlace público: { tokenPublico } (solo lectura).
 * `usuarioQuiz` = usuario cuyos intentos se muestran; null = no cargar quiz (vista pública).
 */
export async function cargarAnalisis(where: Prisma.AnalisisWhereInput, opciones: { usuarioQuiz: string | null; incluirQuiz: boolean }) {
  const analisis = await db.analisis.findFirst({
    where,
    include: {
      explicaciones: { orderBy: { orden: "asc" } },
      diagramas: true,
      conceptos: true,
      hallazgos: true,
    },
  });
  if (!analisis) return null;

  // El JSON guardado se vuelve a validar: si el esquema cambió o el dato se corrompió, no rompe la página.
  const resumenParseado = ResumenSchema.safeParse(analisis.resumen);

  const vista: AnalisisVista = {
    codigo: analisis.codigo,
    lenguaje: analisis.lenguaje,
    resumen: resumenParseado.success ? resumenParseado.data : null,
    bloques: analisis.explicaciones.map((e) => ({ lineaInicio: e.lineaInicio, lineaFin: e.lineaFin, titulo: e.titulo, explicacion: e.explicacion })),
    diagramas: [...analisis.diagramas]
      .sort((a, b) => ORDEN_DIAGRAMAS.indexOf(a.tipo) - ORDEN_DIAGRAMAS.indexOf(b.tipo))
      .map((d) => ({ tipo: d.tipo, titulo: d.titulo, mermaid: d.codigoMermaid })),
    conceptos: [...analisis.conceptos]
      .sort((a, b) => (a.lineaInicio ?? Infinity) - (b.lineaInicio ?? Infinity))
      .map((c) => ({ nombre: c.nombre, explicacion: c.explicacion, lineaInicio: c.lineaInicio, lineaFin: c.lineaFin })),
    hallazgos: ordenarHallazgos(
      analisis.hallazgos.map((h) => ({
        tipo: h.tipo,
        severidad: h.severidad,
        titulo: h.titulo,
        descripcion: h.descripcion,
        sugerencia: h.sugerencia,
        lineaInicio: h.lineaInicio,
        lineaFin: h.lineaFin,
      })),
    ),
    quiz: opciones.incluirQuiz ? await obtenerQuizActual(analisis.id, opciones.usuarioQuiz) : null,
  };

  return { analisis, vista };
}
