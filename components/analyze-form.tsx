"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, FileUp, Github, Sparkles, Upload } from "lucide-react";
import { AnalysisProgress, type EstadoEtapa } from "@/components/analysis-progress";
import { MonacoEditor, OPCIONES_EDITOR } from "@/components/code-editor";
import { NivelSelector } from "@/components/nivel-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert, Spinner, Tabs } from "@/components/ui/misc";
import { useIsDark } from "@/hooks/use-is-dark";
import { analizarConStream } from "@/lib/client/analyze-stream";
import { MAX_CODE_CHARS } from "@/lib/config";
import type { EstadoCupo } from "@/lib/limites";
import { LANGUAGES, detectLanguage, languageLabel, type LanguageId } from "@/lib/language";
import { cn } from "@/lib/utils";
import { ETAPAS, type Etapa } from "@/schemas/analysis";
import type { NivelUsuario } from "@/schemas/common";

type Fuente = "pegar" | "archivo" | "gist";
type Fase = "editando" | "analizando" | "error";
interface GistArchivo {
  nombre: string;
  lenguaje: string;
  contenido: string;
}

const ETAPAS_INICIALES = Object.fromEntries(ETAPAS.map((e) => [e, "pendiente"])) as Record<Etapa, EstadoEtapa>;
const EXTENSIONES = ".js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.cs,.php,.sql,.html,.htm,.css,.txt";

export function AnalyzeForm({ nivelInicial, cupo }: { nivelInicial: NivelUsuario; cupo: EstadoCupo }) {
  const router = useRouter();
  const oscuro = useIsDark();

  const [fuente, setFuente] = useState<Fuente>("pegar");
  const [codigo, setCodigo] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState<string | undefined>();
  const [lenguajeSel, setLenguajeSel] = useState<LanguageId | "auto">("auto");
  const [nivel, setNivel] = useState<NivelUsuario>(nivelInicial);
  const [titulo, setTitulo] = useState("");
  const [forzar, setForzar] = useState(false);

  const [arrastrando, setArrastrando] = useState(false);
  const [errorFuente, setErrorFuente] = useState<string | null>(null);
  const [gistUrl, setGistUrl] = useState("");
  const [gistCargando, setGistCargando] = useState(false);
  const [gistArchivos, setGistArchivos] = useState<GistArchivo[]>([]);

  const [fase, setFase] = useState<Fase>("editando");
  const [etapas, setEtapas] = useState(ETAPAS_INICIALES);
  const [mensajesEtapa, setMensajesEtapa] = useState<Partial<Record<Etapa, string>>>({});
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);
  const [analisisFallidoId, setAnalisisFallidoId] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const codigoDiferido = useDeferredValue(codigo);
  const detectado = useMemo(() => detectLanguage(codigoDiferido, nombreArchivo), [codigoDiferido, nombreArchivo]);
  const lenguajeEfectivo = lenguajeSel === "auto" ? detectado : lenguajeSel;

  const largo = codigo.length;
  const excede = largo > MAX_CODE_CHARS;
  const vacio = codigo.trim().length < 3;
  const analizando = fase === "analizando";

  function cargarCodigo(texto: string, nombre?: string) {
    setCodigo(texto);
    setNombreArchivo(nombre);
    if (nombre && !titulo) setTitulo(nombre);
    setLenguajeSel("auto");
    setFuente("pegar");
  }

  async function leerArchivo(file: File) {
    setErrorFuente(null);
    if (file.size > MAX_CODE_CHARS * 4) {
      setErrorFuente(`El archivo es demasiado grande. El máximo son ${MAX_CODE_CHARS.toLocaleString("es-CO")} caracteres.`);
      return;
    }
    const texto = await file.text();
    if (texto.includes("\u0000")) {
      setErrorFuente("Ese archivo parece binario. Sube un archivo de código de texto.");
      return;
    }
    cargarCodigo(texto, file.name);
  }

  async function cargarGist() {
    setErrorFuente(null);
    setGistArchivos([]);
    setGistCargando(true);
    try {
      const res = await fetch(`/api/gist?url=${encodeURIComponent(gistUrl.trim())}`);
      const data = (await res.json().catch(() => ({}))) as { archivos?: GistArchivo[]; error?: string };
      if (!res.ok || !data.archivos) {
        setErrorFuente(data.error ?? "No se pudo leer el Gist.");
        return;
      }
      if (data.archivos.length === 1) cargarCodigo(data.archivos[0].contenido, data.archivos[0].nombre);
      else setGistArchivos(data.archivos);
    } catch {
      setErrorFuente("Sin conexión con el servidor.");
    } finally {
      setGistCargando(false);
    }
  }

  async function analizar() {
    setFase("analizando");
    setErrorAnalisis(null);
    setAnalisisFallidoId(null);
    setEtapas(ETAPAS_INICIALES);
    setMensajesEtapa({});

    // Objeto mutable: TypeScript no estrecha mal los valores asignados dentro del callback del stream.
    const res: { analisisId: string | null; terminado: "COMPLETO" | "ERROR" | null; mensaje?: string; desdeCache?: boolean } = {
      analisisId: null,
      terminado: null,
    };

    try {
      await analizarConStream({ codigo, lenguaje: lenguajeSel, nivel, titulo: titulo || undefined, forzar }, (e) => {
        if (e.type === "start") res.analisisId = e.analisisId;
        else if (e.type === "stage") {
          setEtapas((prev) => ({ ...prev, [e.etapa]: e.status }));
          if (e.message) setMensajesEtapa((prev) => ({ ...prev, [e.etapa]: e.message }));
        } else if (e.type === "done") {
          res.terminado = e.estado;
          res.mensaje = e.message;
          res.desdeCache = e.desdeCache;
        } else if (e.type === "error") {
          res.terminado = "ERROR";
          res.mensaje = e.message;
        }
      });
    } catch (err) {
      setErrorAnalisis(err instanceof Error ? err.message : "No se pudo iniciar el análisis.");
      setFase("error");
      return;
    }

    if (res.terminado === "ERROR") {
      setErrorAnalisis(res.mensaje ?? "No se pudo analizar el código.");
      setAnalisisFallidoId(res.analisisId);
      setFase("error");
      return;
    }
    // COMPLETO, o la conexión se cortó pero el análisis sigue en el servidor: la página de resultados se encarga.
    if (res.analisisId) router.push(`/analysis/${res.analisisId}${res.desdeCache ? "?cache=1" : ""}`);
    else {
      setErrorAnalisis("La conexión se interrumpió. Revisa tu historial.");
      setFase("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ---------- Entrada de código ---------- */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <Tabs
            value={fuente}
            onChange={setFuente}
            items={[
              { id: "pegar", label: <><ClipboardPaste className="size-4" /> Pegar</> },
              { id: "archivo", label: <><FileUp className="size-4" /> Archivo</> },
              { id: "gist", label: <><Github className="size-4" /> Gist</> },
            ]}
          />
          <span className={cn("text-xs tabular-nums", excede ? "font-medium text-destructive" : "text-muted-foreground")} aria-live="polite">
            {largo.toLocaleString("es-CO")} / {MAX_CODE_CHARS.toLocaleString("es-CO")} caracteres
          </span>
        </div>

        {errorFuente && <Alert variant="error" className="m-3">{errorFuente}</Alert>}

        {fuente === "pegar" && (
          <div className="relative h-[52vh] min-h-[340px]">
            <MonacoEditor
              value={codigo}
              language={lenguajeEfectivo}
              theme={oscuro ? "vs-dark" : "light"}
              options={OPCIONES_EDITOR}
              onChange={(v) => {
                setCodigo(v ?? "");
                if (!v) setNombreArchivo(undefined);
              }}
            />
            {codigo.length === 0 && (
              <p className="pointer-events-none absolute left-14 top-3 max-w-md text-sm text-muted-foreground/70">
                Pega aquí el código que generó la IA y que no terminas de entender…
              </p>
            )}
          </div>
        )}

        {fuente === "archivo" && (
          <div className="p-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void leerArchivo(f);
              }}
              className={cn(
                "flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                arrastrando ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm">Arrastra un archivo de código aquí</p>
              <p className="text-xs text-muted-foreground">JS, TS, Python, Java, C#, PHP, SQL, HTML o CSS</p>
              <Button type="button" variant="outline" onClick={() => inputArchivo.current?.click()}>
                Elegir archivo
              </Button>
              <input
                ref={inputArchivo}
                type="file"
                accept={EXTENSIONES}
                className="sr-only"
                aria-label="Subir archivo de código"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void leerArchivo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        )}

        {fuente === "gist" && (
          <div className="min-h-[300px] space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="gist-url">URL de un Gist público</Label>
              <div className="flex gap-2">
                <Input
                  id="gist-url"
                  inputMode="url"
                  placeholder="https://gist.github.com/usuario/…"
                  value={gistUrl}
                  onChange={(e) => setGistUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && gistUrl.trim() && void cargarGist()}
                />
                <Button type="button" onClick={cargarGist} disabled={gistCargando || !gistUrl.trim()}>
                  {gistCargando ? <Spinner /> : null} Cargar
                </Button>
              </div>
            </div>
            {gistArchivos.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Este Gist tiene varios archivos. Elige uno:</p>
                <ul className="space-y-2">
                  {gistArchivos.map((a) => (
                    <li key={a.nombre}>
                      <Button type="button" variant="outline" className="w-full justify-between" onClick={() => cargarCodigo(a.contenido, a.nombre)}>
                        <span className="truncate font-mono text-xs">{a.nombre}</span>
                        <span className="text-xs text-muted-foreground">{languageLabel(a.lenguaje)}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ---------- Ajustes / progreso ---------- */}
      <Card className="h-fit">
        {fase === "editando" || fase === "error" ? (
          <>
            <CardHeader className="pb-3">
              <CardTitle>Ajustes del análisis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título (opcional)</Label>
                <Input id="titulo" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Login con JWT" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lenguaje">Lenguaje</Label>
                <Select id="lenguaje" value={lenguajeSel} onChange={(e) => setLenguajeSel(e.target.value as LanguageId | "auto")}>
                  <option value="auto">
                    Detección automática{!vacio && lenguajeSel === "auto" ? ` · ${detectado === "plaintext" ? "sin detectar" : languageLabel(detectado)}` : ""}
                  </option>
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nivel de explicación</Label>
                <NivelSelector value={nivel} onChange={setNivel} />
              </div>

              {fase === "error" && errorAnalisis && (
                <Alert variant="error" title="No se pudo completar el análisis">
                  {errorAnalisis}
                  {analisisFallidoId && (
                    <button type="button" className="mt-2 block text-xs text-primary underline" onClick={() => router.push(`/analysis/${analisisFallidoId}`)}>
                      Ver el análisis guardado
                    </button>
                  )}
                </Alert>
              )}

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" checked={forzar} onChange={(e) => setForzar(e.target.checked)} />
                <span>
                  Ignorar caché
                  <span className="block text-xs text-muted-foreground">Si este código ya se analizó con este nivel, normalmente se reutiliza al instante y no cuenta para tu límite.</span>
                </span>
              </label>

              <Button className="w-full" size="lg" onClick={analizar} disabled={vacio || excede}>
                <Sparkles /> Analizar código
              </Button>
              <p className={cn("text-center text-xs", cupo.restantes === 0 ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
                {cupo.restantes === 0
                  ? `Usaste tus ${cupo.limite} análisis nuevos de hoy. Los códigos ya analizados siguen disponibles desde la caché.`
                  : `Te quedan ${cupo.restantes} de ${cupo.limite} análisis nuevos hoy.`}
              </p>
              {excede && <p className="text-xs text-destructive">Reduce el código a {MAX_CODE_CHARS.toLocaleString("es-CO")} caracteres o menos.</p>}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Spinner className="text-primary" /> Analizando tu código…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnalysisProgress etapas={etapas} mensajes={mensajesEtapa} />
              <p className="text-xs text-muted-foreground">Suele tardar entre 15 y 50 segundos según el tamaño del código. No cierres esta pestaña.</p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
