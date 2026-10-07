import Link from "next/link";
import { LogOut, ScanSearch } from "lucide-react";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const session = await auth();
  const usuario = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScanSearch className="size-4" />
          </span>
          VibeDecoder
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
          {usuario ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/dashboard">Historial</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/analyze">Nuevo análisis</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/perfil">{usuario.name ?? "Perfil"}</Link>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
                  <LogOut />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Crear cuenta</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
