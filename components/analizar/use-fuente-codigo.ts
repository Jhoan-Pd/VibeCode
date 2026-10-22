"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { pedirJson } from "@/lib/client/api";
import { MAX_CODE_CHARS } from "@/lib/config";
import { detectLanguage, type LanguageId } from "@/lib/language";
import { formatearNumero } from "@/lib/utils";

export type Fuente = "pegar" | "archivo" | "gist";
export interface GistArchivo {
  nombre: string;
  lenguaje: string;
  contenido: string;
}

/**
 * De dónde sale el código (editor, archivo o Gist) y el lenguaje detectado. La detección corre
 * sobre un valor diferido para no bloquear la escritura en el editor con textos largos.
 */
export function useFuenteCodigo() {
  const [fuente, setFuente] = useState<Fuente>("pegar");
  const [codigo, setCodigo] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState<string | undefined>();
  const [lenguajeSel, setLenguajeSel] = useState<LanguageId | "auto">("auto");
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gistCargando, setGistCargando] = useState(false);
  const [gistArchivos, setGistArchivos] = useState<GistArchivo[]>([]);

  const codigoDiferido = useDeferredValue(codigo);
  const detectado = useMemo(() => detectLanguage(codigoDiferido, nombreArchivo), [codigoDiferido, nombreArchivo]);

  function cargarCodigo(texto: string, nombre?: string) {
    setCodigo(texto);
    setNombreArchivo(nombre);
    if (nombre && !titulo) setTitulo(nombre);
    setLenguajeSel("auto");
    setFuente("pegar");
  }

  function editar(texto: string) {
    setCodigo(texto);
    if (!texto) setNombreArchivo(undefined);
  }

  async function leerArchivo(file: File) {
    setError(null);
    // Un carácter ocupa hasta 4 bytes en UTF-8: por encima de eso seguro excede el máximo.
    if (file.size > MAX_CODE_CHARS * 4) {
      setError(`El archivo es demasiado grande. El máximo son ${formatearNumero(MAX_CODE_CHARS)} caracteres.`);
      return;
    }
    const texto = await file.text();
    if (texto.includes("\u0000")) {
      setError("Ese archivo parece binario. Sube un archivo de código de texto.");
      return;
    }
    cargarCodigo(texto, file.name);
  }

  async function cargarGist(url: string) {
    setError(null);
    setGistArchivos([]);
    setGistCargando(true);
    const r = await pedirJson<{ archivos: GistArchivo[] }>(`/api/gist?url=${encodeURIComponent(url.trim())}`, {
      metodo: "GET",
      errorPorDefecto: "No se pudo leer el Gist.",
    });
    setGistCargando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const { archivos } = r.datos;
    if (archivos.length === 1) cargarCodigo(archivos[0].contenido, archivos[0].nombre);
    else setGistArchivos(archivos);
  }

  return {
    fuente,
    setFuente,
    codigo,
    editar,
    cargarCodigo,
    lenguajeSel,
    setLenguajeSel,
    detectado,
    lenguajeEfectivo: lenguajeSel === "auto" ? detectado : lenguajeSel,
    titulo,
    setTitulo,
    error,
    leerArchivo,
    cargarGist,
    gistCargando,
    gistArchivos,
  };
}
