import { languageLabel } from "@/lib/language";
import { NIVEL_INFO, type NivelUsuario } from "@/schemas/common";
import { TIPO_PREGUNTA_INFO } from "@/schemas/quiz";
import { DIAGRAMA_INFO, HALLAZGO_INFO, SEVERIDAD_INFO, type AnalisisVista } from "@/schemas/vista";

/**
 * Exportación a Markdown (función pura, probada con Vitest).
 * El quiz se exporta SIN respuestas: sirve para autoevaluarse y nunca filtra la clave de calificación.
 */

export interface MetaExportacion {
  titulo: string;
  nivel: NivelUsuario;
  creadoEn: Date;
  /** URL pública si el análisis está compartido. */
  enlace?: string | null;
}

/** Fence que no choca con comillas invertidas dentro del contenido (```` si el código usa ```). */
export function cerco(contenido: string): string {
  const maximo = Math.max(2, ...[...contenido.matchAll(/`{3,}/g)].map((m) => m[0].length));
  return "`".repeat(maximo + 1);
}

/** Evita que un título con "#", "*" o "[" del LLM rompa la estructura del documento. */
export function escaparLinea(texto: string): string {
  return texto.replace(/\r?\n+/g, " ").replace(/([\\`*_[\]#<>|])/g, "\\$1").trim();
}

const rango = (inicio: number | null, fin: number | null) => (inicio == null ? "" : fin == null || fin === inicio ? `L${inicio}` : `L${inicio}–${fin}`);

export function nombreArchivo(titulo: string, extension: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "analisis"}.${extension}`;
}

export function aMarkdown(datos: AnalisisVista, meta: MetaExportacion): string {
  const lineas = datos.codigo.split("\n");
  const fecha = meta.creadoEn.toISOString().slice(0, 10);
  const lang = datos.lenguaje === "plaintext" ? "" : datos.lenguaje;
  const out: string[] = [];

  out.push(`# ${escaparLinea(meta.titulo)}`, "");
  out.push(`> Análisis generado con VibeDecoder · ${languageLabel(datos.lenguaje)} · nivel ${NIVEL_INFO[meta.nivel].label.toLowerCase()} · ${fecha}`);
  if (meta.enlace) out.push(`> Enlace público: ${meta.enlace}`);
  out.push("");

  if (datos.resumen) {
    const r = datos.resumen;
    out.push("## Resumen", "", r.proposito, "");
    const lista = (titulo: string, items: string[]) => {
      if (items.length === 0) return;
      out.push(`**${titulo}**`, "", ...items.map((i) => `- ${i}`), "");
    };
    lista("Entradas", r.entradas);
    lista("Salidas", r.salidas);
    lista("Dependencias", r.dependencias);
  }

  const f = cerco(datos.codigo);
  out.push("## Código", "", `${f}${lang}`, datos.codigo, f, "");

  if (datos.bloques.length > 0) {
    out.push("## Explicación por bloques", "");
    for (const b of datos.bloques) {
      const fragmento = lineas.slice(b.lineaInicio - 1, b.lineaFin).join("\n");
      const fb = cerco(fragmento);
      out.push(`### ${rango(b.lineaInicio, b.lineaFin)} · ${escaparLinea(b.titulo)}`, "", `${fb}${lang}`, fragmento, fb, "", b.explicacion, "");
    }
  }

  if (datos.diagramas.length > 0) {
    out.push("## Diagramas", "");
    for (const d of datos.diagramas) {
      out.push(`### ${DIAGRAMA_INFO[d.tipo]}: ${escaparLinea(d.titulo)}`, "", "```mermaid", d.mermaid, "```", "");
    }
  }

  if (datos.conceptos.length > 0) {
    out.push("## Glosario", "");
    for (const c of datos.conceptos) {
      const r = rango(c.lineaInicio, c.lineaFin);
      out.push(`- **${escaparLinea(c.nombre)}**${r ? ` (${r})` : ""}: ${c.explicacion.replace(/\r?\n+/g, " ")}`);
    }
    out.push("");
  }

  out.push("## Auditoría de vibe code", "");
  if (datos.hallazgos.length === 0) {
    out.push("Sin hallazgos.", "");
  } else {
    for (const h of datos.hallazgos) {
      const r = rango(h.lineaInicio, h.lineaFin);
      out.push(
        `### [${SEVERIDAD_INFO[h.severidad].label}] ${escaparLinea(h.titulo)}`,
        "",
        `*${HALLAZGO_INFO[h.tipo]}${r ? ` · ${r}` : ""}*`,
        "",
        h.descripcion,
        "",
        `**Sugerencia:** ${h.sugerencia}`,
        "",
      );
    }
  }

  if (datos.quiz && datos.quiz.preguntas.length > 0) {
    out.push("## Quiz de autoevaluación", "", "_Las respuestas no se incluyen: respóndelo en VibeDecoder para recibir la calificación._", "");
    datos.quiz.preguntas.forEach((p, i) => {
      out.push(`${i + 1}. **${TIPO_PREGUNTA_INFO[p.tipo]}** — ${p.enunciado.replace(/\r?\n+/g, " ")}`);
      if (p.tipo === "VERDADERO_FALSO") out.push("   - Verdadero", "   - Falso");
      else for (const o of p.opciones ?? []) out.push(`   - ${o.replace(/\r?\n+/g, " ")}`);
    });
    out.push("");
  }

  return out.join("\n").trimEnd() + "\n";
}
