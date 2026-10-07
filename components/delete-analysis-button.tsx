"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

export function DeleteAnalysisButton({ id, redirigirA }: { id: string; redirigirA?: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function borrar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/analysis/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (redirigirA) router.push(redirigirA);
        router.refresh();
      }
    } finally {
      setCargando(false);
      setConfirmando(false);
    }
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
