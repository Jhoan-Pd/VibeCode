"use client";

import { cn } from "@/lib/utils";
import { NIVELES, NIVEL_INFO, type NivelUsuario } from "@/schemas/common";

/** Selector de nivel (principiante / intermedio / avanzado) como grupo de radios accesible. */
export function NivelSelector({
  value,
  onChange,
  disabled,
}: {
  value: NivelUsuario;
  onChange: (n: NivelUsuario) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Nivel de explicación" className="grid gap-2">
      {NIVELES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
            value === n ? "border-primary bg-primary/10" : "hover:border-primary/40",
          )}
        >
          <span className="text-sm font-medium">{NIVEL_INFO[n].label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{NIVEL_INFO[n].descripcion}</span>
        </button>
      ))}
    </div>
  );
}
