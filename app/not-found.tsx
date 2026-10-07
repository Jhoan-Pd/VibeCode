import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esa página</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Puede que el análisis no exista o no sea tuyo.</p>
      <Button asChild>
        <Link href="/dashboard">Ir a mi historial</Link>
      </Button>
    </div>
  );
}
