"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NivelSelector } from "@/components/nivel-selector";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import type { NivelUsuario } from "@/schemas/common";

export function PerfilForm({ nombreInicial, nivelInicial, email }: { nombreInicial: string; nivelInicial: NivelUsuario; email: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [nivel, setNivel] = useState(nivelInicial);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nivel, ...(nombre.trim().length >= 2 ? { nombre: nombre.trim() } : {}) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMensaje({ tipo: "error", texto: data.error ?? "No se pudo guardar." });
      } else {
        setMensaje({ tipo: "success", texto: "Perfil actualizado. Tus próximos análisis usarán este nivel." });
        router.refresh();
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Sin conexión con el servidor." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      {mensaje && <Alert variant={mensaje.tipo}>{mensaje.texto}</Alert>}
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" value={email} disabled readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label>Tu nivel de programación</Label>
        <p className="text-xs text-muted-foreground">Las explicaciones se adaptan a este nivel. Puedes cambiarlo en cada análisis.</p>
        <NivelSelector value={nivel} onChange={setNivel} />
      </div>
      <Button type="submit" disabled={cargando}>
        {cargando && <Spinner />} Guardar cambios
      </Button>
    </form>
  );
}
