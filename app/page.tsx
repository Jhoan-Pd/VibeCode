import Link from "next/link";
import { ArrowRight, Bug, GitBranch, Layers, MousePointerClick, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { DemoViewer } from "@/components/demo-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PASOS = [
  { n: "01", titulo: "Pega tu código", texto: "En el editor, desde un archivo o con la URL de un Gist. Detectamos el lenguaje solos." },
  { n: "02", titulo: "Elige tu nivel", texto: "Principiante, intermedio o avanzado: la explicación se adapta a lo que ya sabes." },
  { n: "03", titulo: "Entiéndelo de verdad", texto: "Resumen, explicación por bloques, diagrama de flujo y, muy pronto, un quiz que comprueba que lo captaste." },
];

const FUNCIONES = [
  { icono: MousePointerClick, titulo: "Código y explicación sincronizados", texto: "Pasa el mouse por una explicación y se resalta su código, y al revés." },
  { icono: GitBranch, titulo: "Diagramas Mermaid", texto: "El flujo de ejecución dibujado, validado antes de mostrarlo." },
  { icono: Layers, titulo: "Adaptado a tu nivel", texto: "La misma función explicada para quien empieza o para quien busca trade-offs." },
  { icono: ShieldCheck, titulo: "Tu código nunca se ejecuta", texto: "Solo se lee y se analiza. La clave de la IA vive en el servidor, no en tu navegador." },
  { icono: Bug, titulo: "Auditoría de «vibe code»", texto: "Próximamente: seguridad, malas prácticas y librerías que la IA pudo inventarse." },
  { icono: Sparkles, titulo: "Quiz de comprensión", texto: "Próximamente: preguntas sobre ESE código para verificar que realmente lo entendiste." },
];

export default async function LandingPage() {
  const session = await auth();
  const destino = session?.user ? "/analyze" : "/register";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <Badge variant="default" className="gap-1.5">
            <Sparkles className="size-3" /> Para código que escribió la IA y tú no
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Deja de copiar código <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">que no entiendes</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Pega lo que te generó la IA y VibeDecoder te lo explica línea por línea, lo dibuja como diagrama de flujo y se adapta a tu nivel.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={destino}>
                {session?.user ? "Analizar código" : "Empezar gratis"} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#demo">Ver demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="container scroll-mt-20 space-y-5 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Pruébalo ahora, sin cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Un ejemplo ya analizado (nivel intermedio). Pasa el mouse por las explicaciones o por el código y abre la pestaña del diagrama.
          </p>
        </div>
        <DemoViewer />
      </section>

      {/* Cómo funciona */}
      <section className="container space-y-8 pt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Cómo funciona</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PASOS.map((p) => (
            <Card key={p.n}>
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
      <section className="container space-y-8 pt-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Pensado para entender, no solo para copiar</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map((f) => (
            <div key={f.titulo} className="flex gap-3 rounded-lg border p-4">
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
      <section className="container pt-20">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">¿Qué código llevas copiado hoy sin entender?</h2>
            <Button asChild size="lg">
              <Link href={destino}>
                Decodificarlo ahora <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
