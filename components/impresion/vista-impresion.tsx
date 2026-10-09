import { MermaidDiagram } from "@/components/mermaid-diagram";
import { TextoConCodigo } from "@/components/texto-con-codigo";
import { languageLabel } from "@/lib/language";
import { NIVEL_INFO, type NivelUsuario } from "@/schemas/common";
import { TIPO_PREGUNTA_INFO } from "@/schemas/quiz";
import { DIAGRAMA_INFO, HALLAZGO_INFO, SEVERIDAD_INFO, type AnalisisVista } from "@/schemas/vista";

const rango = (inicio: number | null, fin: number | null) => (inicio == null ? null : fin == null || fin === inicio ? `L${inicio}` : `L${inicio}–${fin}`);

/** Código con números de línea (una fila por línea; las filas no se parten entre páginas). */
function CodigoNumerado({ codigo, desde = 1 }: { codigo: string; desde?: number }) {
  const lineas = codigo.split("\n");
  const ancho = String(desde + lineas.length - 1).length;
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-[1.55] print:overflow-visible print:whitespace-pre-wrap">
      {lineas.map((l, i) => (
        <div key={i} className="flex break-inside-avoid">
          <span className="mr-3 shrink-0 select-none text-right text-muted-foreground" style={{ width: `${ancho}ch` }}>
            {desde + i}
          </span>
          <span className="whitespace-pre-wrap break-all">{l || " "}</span>
        </div>
      ))}
    </pre>
  );
}

function Seccion({ titulo, children, nuevaPagina = false }: { titulo: string; children: React.ReactNode; nuevaPagina?: boolean }) {
  return (
    <section className={nuevaPagina ? "space-y-3 print:break-before-page" : "space-y-3"}>
      <h2 className="border-b pb-1 text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Documento imprimible del análisis (para "Guardar como PDF"). Sin Monaco ni pestañas: todo el
 * contenido en orden de lectura. El quiz va sin respuestas, igual que en la exportación Markdown.
 */
export function VistaImpresion({ datos, titulo, nivel, creadoEn }: { datos: AnalisisVista; titulo: string; nivel: NivelUsuario; creadoEn: Date }) {
  const lineas = datos.codigo.split("\n");
  return (
    <article className="mx-auto max-w-4xl space-y-8 text-sm leading-relaxed">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground">
          {languageLabel(datos.lenguaje)} · nivel {NIVEL_INFO[nivel].label.toLowerCase()} · {creadoEn.toLocaleDateString("es-CO")} · generado con VibeDecoder
        </p>
      </header>

      {datos.resumen && (
        <Seccion titulo="Resumen">
          <p>
            <TextoConCodigo texto={datos.resumen.proposito} />
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["Entradas", datos.resumen.entradas],
                ["Salidas", datos.resumen.salidas],
                ["Dependencias", datos.resumen.dependencias],
              ] as const
            ).map(([t, items]) => (
              <div key={t}>
                <p className="font-medium">{t}</p>
                {items.length === 0 ? (
                  <p className="text-muted-foreground">Ninguna</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {items.map((i) => (
                      <li key={i}>
                        <TextoConCodigo texto={i} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Código">
        <CodigoNumerado codigo={datos.codigo} />
      </Seccion>

      {datos.bloques.length > 0 && (
        <Seccion titulo="Explicación por bloques">
          <div className="space-y-5">
            {datos.bloques.map((b, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-semibold">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{rango(b.lineaInicio, b.lineaFin)}</span>
                  {b.titulo}
                </h3>
                <CodigoNumerado codigo={lineas.slice(b.lineaInicio - 1, b.lineaFin).join("\n")} desde={b.lineaInicio} />
                <p>
                  <TextoConCodigo texto={b.explicacion} />
                </p>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {datos.diagramas.length > 0 && (
        <Seccion titulo="Diagramas" nuevaPagina>
          {datos.diagramas.map((d) => (
            <div key={d.tipo} className="break-inside-avoid space-y-2">
              <h3 className="font-semibold">
                {DIAGRAMA_INFO[d.tipo]}: {d.titulo}
              </h3>
              <MermaidDiagram codigo={d.mermaid} tipo={d.tipo} />
            </div>
          ))}
        </Seccion>
      )}

      {datos.conceptos.length > 0 && (
        <Seccion titulo="Glosario">
          <dl className="space-y-2">
            {datos.conceptos.map((c) => (
              <div key={c.nombre} className="break-inside-avoid">
                <dt className="font-semibold">
                  {c.nombre} {rango(c.lineaInicio, c.lineaFin) && <span className="font-mono text-xs font-normal text-muted-foreground">({rango(c.lineaInicio, c.lineaFin)})</span>}
                </dt>
                <dd>
                  <TextoConCodigo texto={c.explicacion} />
                </dd>
              </div>
            ))}
          </dl>
        </Seccion>
      )}

      <Seccion titulo="Auditoría de vibe code">
        {datos.hallazgos.length === 0 ? (
          <p className="text-muted-foreground">Sin hallazgos.</p>
        ) : (
          <div className="space-y-3">
            {datos.hallazgos.map((h, i) => (
              <div key={i} className="break-inside-avoid rounded-md border p-3">
                <p className="font-semibold">
                  [{SEVERIDAD_INFO[h.severidad].label}] {h.titulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {HALLAZGO_INFO[h.tipo]}
                  {rango(h.lineaInicio, h.lineaFin) && ` · ${rango(h.lineaInicio, h.lineaFin)}`}
                </p>
                <p className="mt-1">
                  <TextoConCodigo texto={h.descripcion} />
                </p>
                <p className="mt-1">
                  <strong>Sugerencia:</strong> <TextoConCodigo texto={h.sugerencia} />
                </p>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {datos.quiz && datos.quiz.preguntas.length > 0 && (
        <Seccion titulo="Quiz de autoevaluación" nuevaPagina>
          <p className="text-muted-foreground">Las respuestas no se incluyen: respóndelo en VibeDecoder para recibir la calificación.</p>
          <ol className="list-decimal space-y-3 pl-5">
            {datos.quiz.preguntas.map((p) => (
              <li key={p.id} className="break-inside-avoid">
                <p>
                  <span className="text-xs text-muted-foreground">{TIPO_PREGUNTA_INFO[p.tipo]} · </span>
                  <TextoConCodigo texto={p.enunciado} />
                </p>
                <ul className="mt-1 list-[circle] pl-5">
                  {(p.tipo === "VERDADERO_FALSO" ? ["Verdadero", "Falso"] : (p.opciones ?? [])).map((o) => (
                    <li key={o}>
                      <TextoConCodigo texto={o} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Seccion>
      )}
    </article>
  );
}
