import { conUsuario, jsonError } from "@/lib/api";
import { urlPublica } from "@/lib/compartir";
import { aMarkdown, nombreArchivo } from "@/lib/exportar";
import { cargarAnalisis } from "@/services/vista.service";

export const dynamic = "force-dynamic";

/** GET /api/analysis/:id/exportar — descarga el análisis completo en Markdown (.md). */
export const GET = conUsuario<{ id: string }>(async ({ req, usuarioId, params: { id } }) => {
  const cargado = await cargarAnalisis({ id, usuarioId }, { usuarioQuiz: null, incluirQuiz: true });
  if (!cargado) return jsonError("Análisis no encontrado", 404);
  const { analisis, vista } = cargado;

  const md = aMarkdown(vista, {
    titulo: analisis.titulo,
    nivel: analisis.nivel,
    creadoEn: analisis.creadoEn,
    enlace: analisis.tokenPublico ? urlPublica(new URL(req.url).origin, analisis.tokenPublico) : null,
  });
  const archivo = nombreArchivo(analisis.titulo, "md");

  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      // filename* con UTF-8 por si el navegador lo usa; filename simple ASCII como respaldo.
      "content-disposition": `attachment; filename="${archivo}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
