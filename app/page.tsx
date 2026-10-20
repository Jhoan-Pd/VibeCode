import Link from "next/link";
import { ArrowRight, Bug, GitBranch, GraduationCap, Layers, MessageCircleQuestion, MousePointerClick, Share2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { DemoViewer } from "@/components/demo-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PalabraCambiante } from "@/components/motion/palabra-cambiante";
import { LIMITE_ANALISIS_DIARIO } from "@/lib/config";
import { retraso } from "@/lib/movimiento";

const PASOS = [
  { n: "01", titulo: "Pega tu código", texto: "En el editor, desde un archivo o con la URL de un Gist. Detectamos el lenguaje automáticamente." },
  { n: "02", titulo: "Elige tu nivel", texto: "Principiante, intermedio o avanzado: la explicación se adapta a lo que ya sabes." },
  {
    n: "03",
    titulo: "Entiéndelo y compruébalo",
    texto: "Lee el resumen y la explicación por bloques, revisa los diagramas y la auditoría, y responde el quiz para saber qué te falta repasar.",
  },
];

/** Solo funciones que ya existen en la app (cada una enlaza con una pestaña o página real). */
const FUNCIONES = [
  { icono: MousePointerClick, titulo: "Código y explicación sincronizados", texto: "Pasa el mouse por una explicación y se resalta su código, y al revés." },
  { icono: GitBranch, titulo: "Diagramas de flujo, clases y secuencia", texto: "Dibujados a partir de tu código y validados antes de mostrarse. Si alguno falla, la IA lo corrige." },
  { icono: Layers, titulo: "Adaptado a tu nivel", texto: "La misma función explicada para quien empieza o para quien compara alternativas, con un glosario de cada concepto." },
  { icono: Bug, titulo: "Auditoría de «vibe code»", texto: "Seguridad, malas prácticas, código muerto, manejo de errores y funciones que la IA pudo inventarse." },
  { icono: GraduationCap, titulo: "Quiz de comprensión", texto: "Preguntas sobre ESE código. Si sacas menos del 70 %, te dice qué líneas repasar." },
  { icono: MessageCircleQuestion, titulo: "Pregúntale a la IA", texto: "Selecciona unas líneas y pregunta lo que no entiendas. La conversación queda guardada con el análisis." },
  { icono: TrendingUp, titulo: "Tu progreso", texto: "Qué conceptos dominas, cuáles conviene reforzar y cómo evoluciona tu puntaje en los quizzes." },
  { icono: Share2, titulo: "Exportar y compartir", texto: "Descárgalo en Markdown, guárdalo como PDF o comparte un enlace de solo lectura que puedes desactivar." },
  { icono: ShieldCheck, titulo: "Tu código nunca se ejecuta", texto: "Solo se lee y se analiza. La clave de la IA vive en el servidor, no en tu navegador." },
];

export default async function LandingPage() {
  const session = await auth();
  const conSesion = Boolean(session?.user);
  const destino = conSesion ? "/analyze" : "/register";
  // Un solo texto para el CTA principal (arriba y al final) y la misma unidad, «análisis», en toda la app.
  const textoCta = conSesion ? "Analizar mi código" : "Crear cuenta gratis";
  const notaCta = conSesion
    ? "Los códigos que ya analizaste se abren al instante y no cuentan para tu límite."
    : `Gratis · ${LIMITE_ANALISIS_DIARIO} análisis nuevos al día · Sin tarjeta`;

  return (
    <>
      {/* Hero: entra por líneas (sube 32 px y aparece), escalonado cada 75 ms. */}
      <section className="overflow-x-clip">
        <div className="container flex flex-col items-center gap-7 py-20 text-center md:py-28">
          <Badge variant="default" className="vd-enter gap-1.5" style={retraso(0, 75)}>
            <Sparkles className="size-3" /> Para el código que escribió la IA y tú no
          </Badge>
          <h1 className="vd-title max-w-4xl text-5xl leading-[0.95] sm:text-6xl lg:text-[5.25rem]">
            <span className="vd-enter block" style={retraso(1, 75)}>
              Deja de <PalabraCambiante palabras={["copiar", "pegar"]} /> código
            </span>
            <span className="vd-enter block text-primary" style={retraso(2, 75)}>
              que no entiendes
            </span>
          </h1>
          <p className="vd-enter max-w-2xl text-lg text-muted-foreground" style={retraso(3, 75)}>
            VibeDecoder te explica línea por línea el código que te dio la IA, lo dibuja en diagramas y señala sus riesgos. Al final, un quiz
            comprueba que de verdad lo entendiste.
          </p>
          <div className="vd-enter space-y-3" style={retraso(4, 75)}>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href={destino}>
                  {textoCta} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#demo">Ver un ejemplo analizado</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{notaCta}</p>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="container scroll-mt-20 space-y-5 pb-4">
        <div className="space-y-2" data-revelar>
          <h2 className="vd-title text-3xl sm:text-4xl">Pruébalo ahora, sin cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Un código real ya analizado con nivel intermedio. Pasa el mouse por las explicaciones o por el código, y recorre las pestañas de
            diagramas, glosario, auditoría y quiz.
          </p>
        </div>
        <div data-revelar style={retraso(1)}>
          <DemoViewer />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="container space-y-10 pt-24">
        <h2 className="vd-title text-center text-3xl sm:text-5xl" data-revelar>
          Cómo funciona
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <Card key={p.n} data-revelar style={retraso(i)}>
              <CardContent className="space-y-2 p-6">
                <span className="font-mono text-sm text-primary">{p.n}</span>
                <h3 className="font-semibold">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Funciones */}
      <section className="container space-y-10 pt-24">
        <h2 className="vd-title text-center text-3xl sm:text-5xl" data-revelar>
          Pensado para entender, no solo para copiar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map((f, i) => (
            <div key={f.titulo} className="flex gap-3 rounded-lg border border-border/70 bg-card p-5 shadow-card" data-revelar style={retraso(i % 3)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icono className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{f.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="container pt-24">
        <Card className="border-primary/10 bg-gradient-to-b from-primary/[0.06] to-primary/[0.12]" data-revelar>
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center sm:p-14">
            <h2 className="vd-title text-3xl sm:text-4xl">¿Qué código llevas copiado hoy sin entender?</h2>
            <Button asChild size="lg">
              <Link href={destino}>
                {textoCta} <ArrowRight />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{notaCta}</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
