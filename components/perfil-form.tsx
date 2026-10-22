"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NivelSelector } from "@/components/nivel-selector";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import type { NivelUsuario } from "@/schemas/common";
import { pedirJson } from "@/lib/client/api";

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
    const r = await pedirJson("/api/perfil", {
      metodo: "PATCH",
      cuerpo: { nivel, ...(nombre.trim().length >= 2 ? { nombre: nombre.trim() } : {}) },
      errorPorDefecto: "No se pudo guardar.",
    });
    setCargando(false);
    if (!r.ok) {
      setMensaje({ tipo: "error", texto: r.error });
      return;
    }
    setMensaje({ tipo: "success", texto: "Perfil actualizado. Tus próximos análisis usarán este nivel." });
    router.refresh();
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
