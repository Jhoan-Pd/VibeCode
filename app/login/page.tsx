import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rutaInternaSegura } from "@/lib/redirect";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
          <CardDescription>Entra para ver tu historial y analizar código nuevo.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm callbackUrl={rutaInternaSegura(callbackUrl)} githubHabilitado={Boolean(process.env.AUTH_GITHUB_ID)} />
        </CardContent>
      </Card>
    </div>
  );
}
