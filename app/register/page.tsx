import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
          <CardDescription>Gratis. Guarda tus análisis y sigue tu progreso.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm githubHabilitado={Boolean(process.env.AUTH_GITHUB_ID)} />
        </CardContent>
      </Card>
    </div>
  );
}
