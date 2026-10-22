/**
 * Aplica `fn` a cada elemento con como máximo `limite` tareas simultáneas, conservando el orden
 * de los resultados (pool de trabajadores que toman el siguiente índice libre). Sirve para no
 * saturar el plan gratuito del LLM cuando el código se divide en varios bloques.
 */
export async function mapConConcurrencia<T, R>(items: readonly T[], limite: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(items.length);
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.max(1, Math.min(limite, items.length)) }, async () => {
    for (let i = siguiente++; i < items.length; i = siguiente++) {
      resultados[i] = await fn(items[i], i);
    }
  });
  await Promise.all(trabajadores);
  return resultados;
}
