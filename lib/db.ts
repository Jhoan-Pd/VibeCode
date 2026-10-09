import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma singleton (Prisma 7 usa "driver adapters": el driver es `pg`, sin binario de Rust).
 * En desarrollo se guarda en globalThis para sobrevivir al hot-reload sin abrir conexiones de más.
 * En serverless (Vercel) cada instancia usa un pool muy pequeño: la agrupación real la hace el pooler de la BD.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL (configúrala en .env.local o en Vercel → Settings → Environment Variables).");
  }
  const adapter = new PrismaPg({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter });
}

function cliente(): PrismaClient {
  globalForPrisma.prisma ??= crearCliente();
  return globalForPrisma.prisma;
}

/**
 * El cliente se crea en la PRIMERA consulta, no al importar el módulo. Así, si falta DATABASE_URL,
 * solo fallan las páginas que usan la BD: la landing y la demo siguen funcionando y el error es claro.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_destino, propiedad) {
    const c = cliente();
    const valor = Reflect.get(c, propiedad, c);
    return typeof valor === "function" ? valor.bind(c) : valor;
  },
});
