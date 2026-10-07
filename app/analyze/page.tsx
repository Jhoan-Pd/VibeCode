import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnalyzeForm } from "@/components/analyze-form";
import { obtenerUsuario } from "@/services/usuarios";

export const metadata: Metadata = { title: "Nuevo análisis" };
export const dynamic = "force-dynamic";

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/analyze");
  const usuario = await obtenerUsuario(session.user.id);
  if (!usuario) redirect("/login");

  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo análisis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pega código, sube un archivo o importa un Gist. Nunca ejecutamos tu código: solo lo leemos y lo explicamos.
        </p>
      </div>
      <AnalyzeForm nivelInicial={usuario.nivel} />
    </div>
  );
}
