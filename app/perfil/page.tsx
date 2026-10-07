import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PerfilForm } from "@/components/perfil-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuario } from "@/services/usuarios";

export const metadata: Metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil");
  const usuario = await obtenerUsuario(session.user.id);
  if (!usuario) redirect("/login");

  return (
    <div className="container max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tu perfil</CardTitle>
          <CardDescription>Configura cómo quieres que te explique el código.</CardDescription>
        </CardHeader>
        <CardContent>
          <PerfilForm nombreInicial={usuario.nombre ?? ""} nivelInicial={usuario.nivel} email={usuario.email} />
        </CardContent>
      </Card>
    </div>
  );
}
