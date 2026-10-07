"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca la página cada pocos segundos (para análisis que aún se están procesando en el servidor). */
export function AutoRefresh({ cadaMs = 4000, maxVeces = 20 }: { cadaMs?: number; maxVeces?: number }) {
  const router = useRouter();
  useEffect(() => {
    let veces = 0;
    const id = setInterval(() => {
      veces += 1;
      router.refresh();
      if (veces >= maxVeces) clearInterval(id);
    }, cadaMs);
    return () => clearInterval(id);
  }, [router, cadaMs, maxVeces]);
  return null;
}
