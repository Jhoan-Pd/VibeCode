"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pedirJson } from "@/lib/client/api";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

export function DeleteAnalysisButton({ id, redirigirA }: { id: string; redirigirA?: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function borrar() {
    setCargando(true);
    const r = await pedirJson(`/api/analysis/${id}`, { metodo: "DELETE", errorPorDefecto: "No se pudo eliminar." });
    setCargando(false);
    setConfirmando(false);
    if (!r.ok) return;
    if (redirigirA) router.push(redirigirA);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <Button variant="ghost" size="icon" aria-label="Eliminar análisis" onClick={() => setConfirmando(true)}>
        <Trash2 />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="destructive" size="sm" onClick={borrar} disabled={cargando}>
        {cargando && <Spinner />} Eliminar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirmando(false)} disabled={cargando}>
        Cancelar
      </Button>
    </div>
  );
}
