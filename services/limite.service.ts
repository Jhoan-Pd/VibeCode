import "server-only";
import { LIMITE_ANALISIS_DIARIO, LIMITE_CONSULTAS_DIARIAS, ZONA_HORARIA } from "@/lib/config";
import { db } from "@/lib/db";
import { estadoCupo, fechaClave, type EstadoCupo, type Recurso } from "@/lib/limites";

export const LIMITES: Record<Recurso, number> = { analisis: LIMITE_ANALISIS_DIARIO, consultas: LIMITE_CONSULTAS_DIARIAS };

export type ResultadoConsumo = ({ ok: true } | { ok: false }) & EstadoCupo;

/**
 * Consume una unidad del cupo diario de forma ATÓMICA: un solo INSERT ... ON CONFLICT DO UPDATE
 * con la condición `< limite`. Dos peticiones simultáneas nunca superan el límite (no hay
 * "leer y luego escribir"). Si no devuelve fila, el cupo ya estaba agotado.
 */
export async function consumir(usuarioId: string, recurso: Recurso): Promise<ResultadoConsumo> {
  const limite = LIMITES[recurso];
  const fecha = fechaClave(new Date(), ZONA_HORARIA);

  // Dos consultas fijas (sin interpolar nombres de columna) para no abrir ninguna vía de inyección SQL.
  const filas =
    recurso === "analisis"
      ? await db.$queryRaw<{ usados: number }[]>`
          INSERT INTO uso_diario (id, "usuarioId", fecha, cantidad, "consultasIA")
          VALUES (gen_random_uuid()::text, ${usuarioId}, ${fecha}::date, 1, 0)
          ON CONFLICT ("usuarioId", fecha) DO UPDATE SET cantidad = uso_diario.cantidad + 1
          WHERE uso_diario.cantidad < ${limite}
          RETURNING cantidad AS usados`
      : await db.$queryRaw<{ usados: number }[]>`
          INSERT INTO uso_diario (id, "usuarioId", fecha, cantidad, "consultasIA")
          VALUES (gen_random_uuid()::text, ${usuarioId}, ${fecha}::date, 0, 1)
          ON CONFLICT ("usuarioId", fecha) DO UPDATE SET "consultasIA" = uso_diario."consultasIA" + 1
          WHERE uso_diario."consultasIA" < ${limite}
          RETURNING "consultasIA" AS usados`;

  if (filas.length > 0) return { ok: true, ...estadoCupo(Number(filas[0].usados), limite) };
  return { ok: false, ...estadoCupo(limite, limite) };
}

/** Devuelve una unidad (p. ej. si el análisis falló entero por un error del proveedor de IA). */
export async function devolver(usuarioId: string, recurso: Recurso): Promise<void> {
  const fecha = new Date(`${fechaClave(new Date(), ZONA_HORARIA)}T00:00:00.000Z`);
  await db.usoDiario.updateMany({
    where: { usuarioId, fecha, ...(recurso === "analisis" ? { cantidad: { gt: 0 } } : { consultasIA: { gt: 0 } }) },
    data: recurso === "analisis" ? { cantidad: { decrement: 1 } } : { consultasIA: { decrement: 1 } },
  });
}

/** Uso de hoy para mostrarlo en la interfaz. */
export async function usoDeHoy(usuarioId: string): Promise<Record<Recurso, EstadoCupo>> {
  const fecha = new Date(`${fechaClave(new Date(), ZONA_HORARIA)}T00:00:00.000Z`);
  const fila = await db.usoDiario.findUnique({ where: { usuarioId_fecha: { usuarioId, fecha } } });
  return {
    analisis: estadoCupo(fila?.cantidad ?? 0, LIMITES.analisis),
    consultas: estadoCupo(fila?.consultasIA ?? 0, LIMITES.consultas),
  };
}
