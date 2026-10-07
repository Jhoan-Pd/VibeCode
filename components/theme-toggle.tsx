"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsDark } from "@/hooks/use-is-dark";

export function ThemeToggle() {
  const oscuro = useIsDark();

  function alternar() {
    const siguienteOscuro = !oscuro;
    document.documentElement.classList.toggle("dark", siguienteOscuro);
    try {
      localStorage.setItem("vd-theme", siguienteOscuro ? "dark" : "light");
    } catch {
      /* almacenamiento no disponible: el cambio vale solo para esta visita */
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={alternar} aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      {oscuro ? <Sun /> : <Moon />}
    </Button>
  );
}
