/** Evita "open redirect": solo se aceptan rutas internas que empiecen por una sola "/". */
export function rutaInternaSegura(valor: string | string[] | undefined, porDefecto = "/dashboard"): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return porDefecto;
  return v;
}
