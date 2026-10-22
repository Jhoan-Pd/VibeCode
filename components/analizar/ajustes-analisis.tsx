"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { NivelSelector } from "@/components/nivel-selector";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { MAX_CODE_CHARS } from "@/lib/config";
import type { EstadoCupo } from "@/lib/limites";
import { LANGUAGES, languageLabel, type LanguageId, type LanguageOrPlain } from "@/lib/language";
import { cn } from "@/lib/utils";
import type { NivelUsuario } from "@/schemas/common";

export interface AjustesProps {
  titulo: string;
  onTitulo: (v: string) => void;
  lenguaje: LanguageId | "auto";
  onLenguaje: (v: LanguageId | "auto") => void;
  /** Lenguaje detectado; null si aún no hay código suficiente para mostrarlo. */
  detectado: LanguageOrPlain | null;
  nivel: NivelUsuario;
  onNivel: (v: NivelUsuario) => void;
  forzar: boolean;
  onForzar: (v: boolean) => void;
  error: { mensaje: string; analisisId: string | null } | null;
  cupo: EstadoCupo;
  excede: boolean;
  puedeAnalizar: boolean;
  onAnalizar: () => void;
}

function textoCupo({ restantes, limite }: EstadoCupo) {
  return restantes === 0
    ? `Usaste tus ${limite} análisis nuevos de hoy. Los códigos ya analizados siguen disponibles desde la caché.`
    : `Te quedan ${restantes} de ${limite} análisis nuevos hoy.`;
}

/** Panel lateral con título, lenguaje, nivel, caché y el botón de analizar. */
export function AjustesAnalisis(p: AjustesProps) {
  const etiquetaAuto = p.detectado ? ` · ${p.detectado === "plaintext" ? "sin detectar" : languageLabel(p.detectado)}` : "";
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle>Ajustes del análisis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="titulo">Título (opcional)</Label>
          <Input id="titulo" maxLength={120} value={p.titulo} onChange={(e) => p.onTitulo(e.target.value)} placeholder="Ej. Login con JWT" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lenguaje">Lenguaje</Label>
          <Select id="lenguaje" value={p.lenguaje} onChange={(e) => p.onLenguaje(e.target.value as LanguageId | "auto")}>
            <option value="auto">Detección automática{etiquetaAuto}</option>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Nivel de explicación</Label>
          <NivelSelector value={p.nivel} onChange={p.onNivel} />
        </div>

        {p.error && (
          <Alert key={p.error.mensaje} variant="error" title="No se pudo completar el análisis" className="vd-shake">
            {p.error.mensaje}
            {p.error.analisisId && (
              <Link href={`/analysis/${p.error.analisisId}`} className="mt-2 block text-xs text-primary underline">
                Ver el análisis guardado
              </Link>
            )}
          </Alert>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={p.forzar} onChange={(e) => p.onForzar(e.target.checked)} />
          <span>
            Ignorar caché
            <span className="block text-xs text-muted-foreground">Si este código ya se analizó con este nivel, normalmente se reutiliza al instante y no cuenta para tu límite.</span>
          </span>
        </label>

        <Button className="w-full" size="lg" onClick={p.onAnalizar} disabled={!p.puedeAnalizar}>
          <Sparkles /> Analizar código
        </Button>
        <p className={cn("text-center text-xs", p.cupo.restantes === 0 ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {textoCupo(p.cupo)}
        </p>
        {p.excede && <p className="text-xs text-destructive">Reduce el código a {MAX_CODE_CHARS.toLocaleString("es-CO")} caracteres o menos.</p>}
      </CardContent>
    </>
  );
}
