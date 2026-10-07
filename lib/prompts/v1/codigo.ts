/**
 * Encierra el código del usuario en delimitadores claros. Se neutraliza cualquier intento de
 * "cerrar" la etiqueta desde dentro del código (defensa básica contra prompt injection).
 */
export function envolverCodigo(codigoNumerado: string, lenguaje: string, rango?: { inicio: number; fin: number; total: number }): string {
  const seguro = codigoNumerado.replace(/<\/?codigo[^>]*>/gi, (m) => m.replace("<", "‹").replace(">", "›"));
  const atributos = rango
    ? ` lenguaje="${lenguaje}" lineas="${rango.inicio}-${rango.fin}" total_lineas_del_archivo="${rango.total}"`
    : ` lenguaje="${lenguaje}"`;
  return `<codigo${atributos}>\n${seguro}\n</codigo>`;
}
