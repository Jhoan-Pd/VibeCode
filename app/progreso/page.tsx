import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CircleDashed, Flame, GraduationCap, Plus, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { GraficaEvolucion } from "@/components/progreso/grafica-evolucion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { languageLabel } from "@/lib/language";
import { UMBRAL_DOMINADO, UMBRAL_EN_PROGRESO, type ConceptoProgreso, type EstadoConcepto } from "@/lib/progreso";
import { cn } from "@/lib/utils";
import { UMBRAL_APROBACION } from "@/schemas/quiz";
import { obtenerProgreso } from "@/services/progreso.service";

export const metadata: Metadata = { title: "Tu progreso" };
export const dynamic = "force-dynamic";

const ESTADOS: Record<EstadoConcepto, { titulo: string; descripcion: string; icono: typeof CheckCircle2; clase: string }> = {
  reforzar: {
    titulo: "Por reforzar",
    descripcion: `Dominio menor al ${UMBRAL_EN_PROGRESO} %`,
    icono: TriangleAlert,
    clase: "text-destructive",
  },
  en_progreso: {
    titulo: "En progreso",
    descripcion: `Entre ${UMBRAL_EN_PROGRESO} % y ${UMBRAL_DOMINADO} %`,
    icono: CircleDashed,
    clase: "text-amber-600 dark:text-amber-400",
  },
  dominado: {
    titulo: "Dominados",
    descripcion: `${UMBRAL_DOMINADO} % o más`,
    icono: CheckCircle2,
    clase: "text-emerald-600 dark:text-emerald-400",
  },
};

export default async function ProgresoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/progreso");

  const p = await obtenerProgreso(session.user.id);
  const sinQuizzes = p.totales.intentos === 0;
  const maxLenguaje = Math.max(1, ...p.lenguajes.map((l) => l.cantidad));

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tu progreso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Qué conceptos ya dominas y cuáles conviene repasar, según tus respuestas en los quizzes.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ver historial</Link>
        </Button>
      </div>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Comprensión promedio" valor={p.promedio == null ? "—" : `${p.promedio} %`} detalle={<Tendencia valor={p.tendencia} />} />
        <Indicador titulo="Quizzes respondidos" valor={String(p.totales.quizzesRespondidos)} detalle={`${p.totales.intentos} intento${p.totales.intentos === 1 ? "" : "s"} en total`} />
        <Indicador titulo="Análisis" valor={String(p.totales.analisis)} detalle={`${p.totales.completos} completo${p.totales.completos === 1 ? "" : "s"} · ${p.totales.mensajesChat} preguntas al chat`} />
        <Indicador
          titulo="Racha"
          valor={`${p.racha} día${p.racha === 1 ? "" : "s"}`}
          detalle={
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3.5" /> {p.racha > 0 ? "días seguidos estudiando" : "analiza o responde un quiz hoy"}
            </span>
          }
        />
      </section>

      {sinQuizzes ? (
        <Card className="flex flex-col items-center gap-4 border-dashed p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap />
          </span>
          <div>
            <h2 className="font-medium">Aún no hay datos de comprensión</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Abre un análisis, ve a la pestaña <strong>Quiz</strong> y respóndelo. Cada pregunta está ligada a un concepto: así sabremos cuáles dominas.
            </p>
          </div>
          <Button asChild>
            <Link href={p.totales.analisis > 0 ? "/dashboard" : "/analyze"}>
              {p.totales.analisis > 0 ? "Elegir un análisis" : <><Plus /> Analizar código</>}
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puntaje de tus quizzes</CardTitle>
              <CardDescription>Últimos {p.evolucion.length} intentos, del más antiguo al más reciente. Pasa el mouse por un punto para ver el detalle.</CardDescription>
            </CardHeader>
            <CardContent>
              <GraficaEvolucion puntos={p.evolucion} umbral={UMBRAL_APROBACION} />
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
                <table className="mt-2 w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 font-medium">Fecha</th>
                      <th className="py-1 font-medium">Análisis</th>
                      <th className="py-1 text-right font-medium">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...p.evolucion].reverse().map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{new Date(e.fecha).toLocaleDateString("es-CO")}</td>
                        <td className="py-1.5 pr-3">
                          <Link href={`/analysis/${e.analisisId}`} className="hover:underline">
                            {e.titulo}
                          </Link>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{e.porcentaje} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </CardContent>
          </Card>

          <section aria-labelledby="titulo-conceptos" className="space-y-3">
            <h2 id="titulo-conceptos" className="text-lg font-semibold">
              Conceptos
            </h2>
            {p.conceptos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tus quizzes aún no tienen preguntas ligadas a conceptos.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {(["reforzar", "en_progreso", "dominado"] as const).map((estado) => (
                  <ColumnaConceptos key={estado} estado={estado} conceptos={p.conceptos.filter((c) => c.estado === estado)} titulos={p.titulos} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {p.lenguajes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lenguajes analizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {p.lenguajes.map((l) => (
                <li key={l.lenguaje} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className="truncate">{languageLabel(l.lenguaje)}</span>
                  <span className="h-2 rounded-full bg-muted" aria-hidden>
                    <span className="block h-2 rounded-full bg-primary" style={{ width: `${(l.cantidad / maxLenguaje) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{l.cantidad}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
    </Card>
  );
}

function Tendencia({ valor }: { valor: number | null }) {
  if (valor == null) return <>mejor intento de cada quiz</>;
  if (Math.abs(valor) < 1) return <>estable en tus últimos intentos</>;
  const sube = valor > 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Icono className="size-3.5" />
      {sube ? "+" : "−"}
      {Math.abs(valor)} pts. respecto a tus primeros intentos
    </span>
  );
}

function ColumnaConceptos({ estado, conceptos, titulos }: { estado: EstadoConcepto; conceptos: ConceptoProgreso[]; titulos: Record<string, string> }) {
  const info = ESTADOS[estado];
  const Icono = info.icono;
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className={cn("flex items-center gap-2 text-sm", info.clase)}>
          <Icono className="size-4" /> {info.titulo} <span className="font-normal text-muted-foreground">({conceptos.length})</span>
        </CardTitle>
        <CardDescription className="text-xs">{info.descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {conceptos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguno por ahora.</p>
        ) : (
          <ul className="space-y-3">
            {conceptos.map((c) => (
              <li key={c.nombre} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{c.nombre}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{c.dominio} %</span>
                </div>
                <span className="block h-1.5 rounded-full bg-muted" aria-hidden>
                  <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, c.dominio)}%` }} />
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {c.aciertos} de {c.total} acierto{c.total === 1 ? "" : "s"}
                    {c.pocasRespuestas && " · pocas respuestas"}
                  </span>
                  {c.repaso && estado !== "dominado" && (
                    <Link
                      href={`/analysis/${c.repaso.analisisId}${c.repaso.lineaInicio ? `?l=${c.repaso.lineaInicio}-${c.repaso.lineaFin ?? c.repaso.lineaInicio}` : ""}`}
                      className="inline-flex items-center gap-1 hover:text-primary"
                      title={titulos[c.repaso.analisisId]}
                    >
                      Repasar <ArrowRight className="size-3" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
