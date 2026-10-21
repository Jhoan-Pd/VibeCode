import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { mensajeErrorAuth } from "@/lib/errores-auth";
import { rutaInternaSegura } from "@/lib/redirect";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; creada?: string }>;
}) {
  const { callbackUrl, error, creada } = await searchParams;
  const mensajeError = mensajeErrorAuth(error);
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
          <CardDescription>Entra para ver tu historial y analizar código nuevo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {creada === "1" && !mensajeError && (
            <Alert variant="success" title="Tu cuenta se creó">
              Entra con tu correo y tu contraseña.
            </Alert>
          )}
          {mensajeError && <Alert variant="error">{mensajeError}</Alert>}
          <LoginForm callbackUrl={rutaInternaSegura(callbackUrl)} githubHabilitado={Boolean(process.env.AUTH_GITHUB_ID)} />
        </CardContent>
      </Card>
    </div>
  );
}
