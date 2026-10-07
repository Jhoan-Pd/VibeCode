"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";

function BotonGithub({ callbackUrl, habilitado }: { callbackUrl: string; habilitado: boolean }) {
  if (!habilitado) return null;
  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => signIn("github", { redirectTo: callbackUrl })}>
        <Github /> Continuar con GitHub
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> o con tu correo <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

export function LoginForm({ callbackUrl, githubHabilitado }: { callbackUrl: string; githubHabilitado: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <BotonGithub callbackUrl={callbackUrl} habilitado={githubHabilitado} />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={cargando || !email || !password}>
          {cargando && <Spinner />} Entrar
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href={`/register`}>
          Crea una
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ githubHabilitado }: { githubHabilitado: boolean }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo crear la cuenta.");
        return;
      }
      // Inicia sesión automáticamente con las credenciales recién creadas.
      const login = await signIn("credentials", { email, password, redirect: false });
      if (!login || login.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <BotonGithub callbackUrl="/dashboard" habilitado={githubHabilitado} />
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <Button type="submit" className="w-full" disabled={cargando || !nombre || !email || password.length < 8}>
          {cargando && <Spinner />} Crear cuenta
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Entra
        </Link>
      </p>
    </div>
  );
}
